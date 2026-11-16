import { test } from "vitest";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hasVersionIntent, inspectVersionIntent } from "./version-intent.mjs";

const manifest = { name: "@lapis-notes/lapis-plugin-tasks", version: "0.2.1" };
const empty = "---\n---\n\nPublication tooling recovery only.\n";
const genuine = `---\n"${manifest.name}": patch\n---\n\nGenuine product change.\n`;

function fixture(notes, run) {
  const root = mkdtempSync(join(tmpdir(), "tasks-intent-test-"));
  try {
    mkdirSync(join(root, ".changeset"));
    writeFileSync(join(root, "package.json"), JSON.stringify(manifest));
    writeFileSync(
      join(root, ".changeset/config.json"),
      readFileSync(new URL("../.changeset/config.json", import.meta.url)),
    );
    for (const [name, text] of Object.entries(notes))
      writeFileSync(join(root, ".changeset", `${name}.md`), text);
    const jj = (args) =>
      execFileSync(
        "jj",
        [
          "--config",
          "signing.behavior=drop",
          "--config",
          'user.name="Tasks fixture"',
          "--config",
          'user.email="fixture@example.invalid"',
          ...args,
        ],
        { cwd: root, stdio: "pipe" },
      );
    jj(["git", "init", "--colocate"]);
    jj(["commit", "-m", "Isolated Changesets status fixture"]);
    jj(["bookmark", "create", "main", "-r", "@-"]);
    run(root);
    assert.deepEqual(
      JSON.parse(readFileSync(join(root, "package.json"))),
      manifest,
    );
    for (const [name, text] of Object.entries(notes))
      assert.equal(
        readFileSync(join(root, ".changeset", `${name}.md`), "utf8"),
        text,
      );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("the installed CLI reports no release for the retained empty recovery note", () => {
  fixture({ recovery: empty }, (root) =>
    assert.equal(inspectVersionIntent(root), false),
  );
});
test("the installed CLI reports no release with no notes", () => {
  fixture({}, (root) => assert.equal(inspectVersionIntent(root), false));
});
test("a genuine patch remains pending alongside an empty historical note", () => {
  fixture({ recovery: empty, product: genuine }, (root) =>
    assert.equal(inspectVersionIntent(root), true),
  );
});
test("unknown package intent fails rather than enabling publication", () => {
  fixture(
    { foreign: genuine.replace(manifest.name, "foreign-package") },
    (root) => assert.throws(() => inspectVersionIntent(root)),
  );
});
test("malformed CLI evidence and foreign targets fail closed", () => {
  const release = {
    name: manifest.name,
    oldVersion: "0.2.1",
    newVersion: "0.2.2",
    type: "patch",
  };
  for (const plan of [
    null,
    {},
    { changesets: [], releases: null },
    { changesets: [], releases: [{ ...release, name: "foreign-package" }] },
    { changesets: [], releases: [{ ...release, oldVersion: "0.2.0" }] },
    { changesets: [], releases: [{ ...release, newVersion: "0.2.1" }] },
    { changesets: [], releases: [release, release] },
  ])
    assert.throws(() => hasVersionIntent(plan, manifest));
});
