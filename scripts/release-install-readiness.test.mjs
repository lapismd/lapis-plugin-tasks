import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import YAML from "yaml";
import { waitForRegistry } from "./release.mjs";
const helpers = await import("./release-install-readiness.mjs").catch(
  () => ({}),
);
const name = "@lapis-notes/lapis-plugin-tasks",
  version = "0.2.1";
const sri = (n) => "sha512-" + Buffer.alloc(64, n).toString("base64");

it("binds installation readiness to verified published bytes when the local candidate differs", async () => {
  expect(typeof helpers.installTasksConsumer).toBe("function");
  const installer = { run: vi.fn(), pending: vi.fn() };
  const api = {
    registryInstaller: vi.fn(() => installer),
    installPublishedConsumer: vi.fn().mockResolvedValue(),
  };
  await helpers.installTasksConsumer(
    {
      cwd: "/tmp/verified-consumer",
      candidate: { name, version, integrity: sri(1) },
      metadata: { name, version, dist: { integrity: sri(2) } },
      published: { integrity: sri(2) },
    },
    api,
  );
  expect(api.installPublishedConsumer).toHaveBeenCalledWith(
    expect.objectContaining({
      entries: [{ name, version, integrity: sri(2) }],
      registry: "https://registry.npmjs.org",
      installer,
    }),
  );
  expect(api.registryInstaller).toHaveBeenCalledWith(
    "npm12-strict-peers",
    "12.0.2",
  );
});
it("rejects unverified published identity and exhausted budgets before loading the shared helper", async () => {
  const base = {
    cwd: "/tmp/verified-consumer",
    candidate: { name, version, integrity: sri(1) },
    metadata: { name, version, dist: { integrity: sri(2) } },
    published: { integrity: sri(2) },
  };
  const api = { registryInstaller: vi.fn(), installPublishedConsumer: vi.fn() };
  for (const changed of [
    { metadata: { ...base.metadata, name: "foreign" } },
    { metadata: { ...base.metadata, version: "9.9.9" } },
    { published: { integrity: sri(3) } },
    { published: {} },
    { budgetMs: 0 },
    { budgetMs: 300001 },
    { budgetMs: Infinity },
  ])
    await expect(
      helpers.installTasksConsumer({ ...base, ...changed }, api),
    ).rejects.toThrow();
  expect(api.registryInstaller).not.toHaveBeenCalled();
  expect(api.installPublishedConsumer).not.toHaveBeenCalled();
});
it("retains the owner-selected remaining budget and strict npm12 policy", async () => {
  const api = {
    registryInstaller: vi.fn(() => ({})),
    installPublishedConsumer: vi.fn(),
  };
  await helpers.installTasksConsumer(
    {
      cwd: "/tmp/consumer",
      candidate: { name, version },
      metadata: { name, version, dist: { integrity: sri(1) } },
      published: { integrity: sri(1) },
      budgetMs: 20000,
    },
    api,
  );
  expect(api.installPublishedConsumer.mock.calls[0][0].policy).toEqual({
    budgetMs: 20000,
    delaysMs: Array(60).fill(5000),
  });
  expect(helpers.TASKS_READINESS_BUDGET_MS).toBe(300000);
  await expect(
    helpers.loadTasksReadiness("relative/module.mjs"),
  ).rejects.toThrow("source-pinned");
  await expect(
    helpers.loadTasksReadiness("/tmp/unreviewed.mjs"),
  ).rejects.toThrow("source-pinned");
});
it("full-version observation and its sleeps stop at the same absolute readiness deadline", async () => {
  let time = 0;
  const waits = [];
  const lookup = vi.fn(async () => {
    time += 2000;
    return null;
  });
  await expect(
    waitForRegistry(
      { name, version },
      {
        deadline: 6000,
        now: () => time,
        lookup,
        sleep: async (ms) => {
          waits.push(ms);
          time += ms;
        },
      },
    ),
  ).rejects.toThrow("not downloadable");
  expect(lookup).toHaveBeenCalledTimes(1);
  expect(waits).toEqual([4000]);
  await expect(
    waitForRegistry(
      { name, version },
      {
        deadline: 7000,
        now: () => time,
        lookup: async () => {
          time += 2000;
          return { name, version };
        },
      },
    ),
  ).rejects.toThrow("not downloadable");
});
it("the publisher prepares the immutable helper before signing while retaining frozen reinstall and audit gates", () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL("../.github/workflows/ci.yml", import.meta.url),
      "utf8",
    ),
  );
  const steps = workflow.jobs.publish.steps;
  const setup = steps.findIndex((step) =>
    step.uses?.startsWith("lapismd/lapis-ci/actions/setup-registry-readiness@"),
  );
  expect(setup).toBeGreaterThan(0);
  expect(steps[setup].uses).toBe(
    "lapismd/lapis-ci/actions/setup-registry-readiness@c9fed365342109997587bd9a5a3b63066e8373aa",
  );
  expect(setup).toBeLessThan(
    steps.findIndex((step) => step.run === "pnpm release:attest"),
  );
  const source = readFileSync(
    new URL("./release.mjs", import.meta.url),
    "utf8",
  );
  expect(
    source.indexOf("verifyPublishedArtifact(metadata, publishedBytes)"),
  ).toBeLessThan(source.indexOf("await installTasksConsumer"));
  expect(source.indexOf("await installTasksConsumer")).toBeLessThan(
    source.indexOf('"ci",'),
  );
  expect(source).toContain('run("npm", ["audit", "signatures"]');
  expect(source).toContain('"--strict-peer-deps"');
  expect(source).toContain('"exec", "publint"');
});
