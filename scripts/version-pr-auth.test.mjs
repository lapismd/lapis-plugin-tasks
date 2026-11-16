import { test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import YAML from "yaml";

const workflow = YAML.parse(
  readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
);
const version = workflow.jobs.changesets;
const writer = version.steps.find((step) =>
  step.uses?.startsWith("changesets/action@"),
);

test("qualified runtime guard validates source inputs before writer App minting", () => {
  const guard = version.steps.find((step) =>
    step.uses?.startsWith("lapismd/lapis-ci/actions/guard-version-runtime@"),
  );
  assert.ok(guard, "source-owned shared runtime guard exists");
  assert.equal(
    guard.uses,
    "lapismd/lapis-ci/actions/guard-version-runtime@bfa9743d8b403681ef7fb81ae3c5e53a99e3de55",
  );
  assert.deepEqual(Object.keys(guard).sort(), ["name", "uses", "with"]);
  assert.deepEqual(guard.with, {
    "qualification-file": ".github/versioning-runtime.json",
  });
  const install = version.steps.find(
    (step) => step.run === "pnpm install --frozen-lockfile --ignore-pnpmfile",
  );
  const app = version.steps.find((step) =>
    step.uses?.startsWith("actions/create-github-app-token@"),
  );
  assert(version.steps.indexOf(install) < version.steps.indexOf(guard));
  assert(version.steps.indexOf(guard) < version.steps.indexOf(app));
  assert.deepEqual(version.outputs, {
    hasChangesets: "${{ steps.changesets.outputs.hasChangesets }}",
  });
  assert.equal(version.needs, "validate");
  assert.equal(
    version.if,
    "github.repository == 'lapismd/lapis-plugin-tasks' && needs.validate.result == 'success' && github.ref == 'refs/heads/main' && github.event_name != 'pull_request'",
  );
  const qualification = JSON.parse(
    readFileSync(
      new URL("../.github/versioning-runtime.json", import.meta.url),
    ),
  );
  const manifest = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url)),
  );
  assert.equal(qualification.cliVersion, "3.0.3");
  assert.equal(qualification.packageManager, manifest.packageManager);
  assert.equal(
    qualification.scripts["release:version"],
    manifest.scripts["release:version"],
  );
  assert.equal(
    manifest.scripts["release:version"],
    "node scripts/release.mjs version",
  );
  const hash = (file) =>
    createHash("sha256")
      .update(readFileSync(new URL("../" + file, import.meta.url)))
      .digest("hex");
  assert.equal(qualification.configSha256, hash(".changeset/config.json"));
  assert.deepEqual(
    Object.keys(qualification.files).sort(),
    [
      "pnpm-workspace.yaml",
      "scripts/release-sigstore.mjs",
      "scripts/release.mjs",
    ].sort(),
    "every source-owned helper in the admitted release recipe is bound",
  );
  for (const [file, digest] of Object.entries(qualification.files))
    assert.equal(digest, hash(file), file);
});

test("version PRs require canonical main and a repository-scoped App without fallback", () => {
  assert.equal(
    version.if,
    "github.repository == 'lapismd/lapis-plugin-tasks' && needs.validate.result == 'success' && github.ref == 'refs/heads/main' && github.event_name != 'pull_request'",
  );
  assert.equal(version.permissions.contents, "read");
  assert.notEqual(version.permissions["pull-requests"], "write");
  const app = version.steps.find((step) =>
    step.uses?.startsWith("actions/create-github-app-token@"),
  );
  assert.ok(app, "version PR writes require an App token");
  assert.equal(app.id, "app");
  assert.equal(app.if, undefined);
  assert.equal(app["continue-on-error"], undefined);
  assert.deepEqual(app.with, {
    "client-id": "${{ vars.LAPIS_DEPENDENCY_APP_CLIENT_ID }}",
    "private-key": "${{ secrets.LAPIS_DEPENDENCY_APP_PRIVATE_KEY }}",
    owner: "${{ github.repository_owner }}",
    repositories: "${{ github.event.repository.name }}",
    "permission-contents": "write",
    "permission-pull-requests": "write",
  });
  assert.ok(version.steps.indexOf(app) < version.steps.indexOf(writer));
  assert.equal(
    writer.env?.GITHUB_TOKEN ?? writer.with?.["github-token"],
    "${{ steps.app.outputs.token }}",
  );
});

test("version preparation keeps API commits and ephemeral checkout credentials", () => {
  const checkout = version.steps.find((step) =>
    step.uses?.startsWith("actions/checkout@"),
  );
  assert.equal(checkout.with["persist-credentials"], false);
  assert.equal(writer.with.version, "pnpm release:version");
  assert.equal(writer.with.commitMode, "github-api");
  assert.equal(writer.with.createGithubReleases, false);
  for (const step of version.steps.filter(
    (step) => step.uses && !step.uses.startsWith("./"),
  ))
    assert.match(step.uses, /@[a-f0-9]{40}$/);
});

test("publisher and dispatch authority remain separate from the PR App", () => {
  assert.equal(version.needs, "validate");
  const publish = workflow.jobs.publish;
  assert.equal(publish.environment, "npm-production");
  assert.equal(publish.permissions["id-token"], "write");
  const command = publish.steps.find(
    (step) => step.run === "pnpm release:publish",
  );
  assert.equal(command.env.GH_TOKEN, "${{ secrets.GITHUB_TOKEN }}");
  assert.ok(!JSON.stringify(publish).includes("steps.app.outputs.token"));
});
