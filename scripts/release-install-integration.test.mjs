import { afterEach, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { commands } = vi.hoisted(() => ({ commands: [] }));
vi.mock("node:child_process", () => ({
  execFileSync: vi.fn((command, args) => {
    commands.push([command, ...args]);
    return "";
  }),
}));
import { verify, integrity, packageName } from "./release.mjs";

const roots = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  commands.length = 0;
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "tasks-readiness-integration-"));
  roots.push(root);
  await mkdir(join(root, ".release"));
  const bytes = Buffer.from("qualified local candidate"),
    publishedBytes = Buffer.from("independently published artifact");
  const source = "a".repeat(40),
    version = "0.2.1";
  const candidate = {
    schema: 1,
    installation: "frozen-registry",
    name: packageName,
    version,
    source,
    tarball: "tasks.tgz",
    integrity: integrity(bytes),
    size: bytes.length,
  };
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: packageName, version }),
  );
  await writeFile(
    join(root, ".release/candidate.json"),
    JSON.stringify(candidate),
  );
  await writeFile(join(root, ".release/tasks.tgz"), bytes);
  const metadata = {
    name: packageName,
    version,
    dist: {
      integrity: integrity(publishedBytes),
      tarball: "https://registry.npmjs.org/tasks.tgz",
      attestations: {
        provenance: { predicateType: "https://slsa.dev/provenance/v1" },
      },
      signatures: [{ keyid: "fixture" }],
    },
  };
  const shared = join(root, "registry-readiness.mjs");
  await writeFile(
    shared,
    `import {writeFile} from 'node:fs/promises';
export const registryInstaller = (profile,version) => {if(profile!=='npm12-strict-peers'||version!=='12.0.2')throw Error('wrong policy');return {};};
export const installPublishedConsumer = async input => writeFile(${JSON.stringify(join(root, "observed.json"))},JSON.stringify(input.entries));\n`,
  );
  vi.stubEnv("GITHUB_SHA", source);
  vi.stubEnv("LAPIS_REGISTRY_READINESS_MODULE", shared);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      String(url).endsWith(".tgz")
        ? new Response(publishedBytes)
        : Response.json(metadata),
    ),
  );
  return { root, candidate, metadata, publishedBytes };
}
it("skip-different installation and its final receipt use verified published integrity", async () => {
  const f = await fixture();
  await verify(f.root, { matchCandidate: false });
  expect(
    JSON.parse(await readFile(join(f.root, "observed.json"), "utf8")),
  ).toEqual([
    {
      name: packageName,
      version: "0.2.1",
      integrity: f.metadata.dist.integrity,
    },
  ]);
  const receipt = JSON.parse(
    await readFile(join(f.root, ".release/registry-receipt.json"), "utf8"),
  );
  expect(receipt.integrity).toBe(f.metadata.dist.integrity);
  expect(receipt.integrity).not.toBe(f.candidate.integrity);
  expect(commands.map((c) => c.slice(0, 3))).toEqual([
    ["npm", "ci", "--ignore-scripts"],
    ["npm", "audit", "signatures"],
    ["pnpm", "exec", "publint"],
  ]);
  expect(commands[0]).toContain("--strict-peer-deps");
});
it("strict candidate mismatch stops before installation or acceptance commands", async () => {
  const f = await fixture();
  await expect(verify(f.root)).rejects.toThrow(
    "differs from the qualified candidate",
  );
  await expect(readFile(join(f.root, "observed.json"))).rejects.toThrow();
  expect(commands).toEqual([]);
});
it("a tampered published artifact stops before readiness even in skip-different mode", async () => {
  const f = await fixture();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) =>
      String(url).endsWith(".tgz")
        ? new Response("tampered")
        : Response.json(f.metadata),
    ),
  );
  await expect(verify(f.root, { matchCandidate: false })).rejects.toThrow(
    "published integrity",
  );
  expect(commands).toEqual([]);
});
it("missing source-pinned shared setup fails rather than falling back to an unbounded install", async () => {
  const f = await fixture();
  vi.stubEnv("LAPIS_REGISTRY_READINESS_MODULE", "");
  await expect(verify(f.root, { matchCandidate: false })).rejects.toThrow(
    "source-pinned",
  );
  expect(commands).toEqual([]);
});
