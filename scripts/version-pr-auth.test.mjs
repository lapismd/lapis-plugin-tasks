import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import YAML from "yaml";

const workflow = YAML.parse(
  readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
);
const version = workflow.jobs.changesets;
const writer = version.steps.find((step) =>
  step.uses?.startsWith("changesets/action@"),
);

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
