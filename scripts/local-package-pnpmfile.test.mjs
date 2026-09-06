import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, it } from "vitest";

const require = createRequire(import.meta.url);
const { createHooks } = require("./local-package-pnpmfile.cjs");

describe("local package pnpm hook", () => {
  it("uses available local package artifacts without changing peer ranges", () => {
    const root = "/workspace/lapis-plugin-tasks";
    const available = new Set([
      path.resolve(
        root,
        "../design-core",
      ),
    ]);
    const manifest = {
      dependencies: {
        "@lapismd/design-core": "^0.1.0",
        "@lapis-notes/api": "^0.1.0",
      },
      peerDependencies: {
        "@lapismd/design-core": "^0.1.0",
      },
    };

    const result = createHooks({
      root,
      fileExists: (candidate) => available.has(candidate),
    }).hooks.readPackage(manifest);

    assert.equal(
      result.dependencies["@lapismd/design-core"],
      `file:${[...available][0]}`,
    );
    assert.equal(result.dependencies["@lapis-notes/api"], "^0.1.0");
    assert.equal(result.peerDependencies["@lapismd/design-core"], "^0.1.0");
  });

  it("leaves registry ranges intact when local artifacts are absent", () => {
    const manifest = {
      devDependencies: {
        "@lapis-notes/api": "0.1.0",
        "@lapismd/design-core": "0.1.2",
      },
    };

    const result = createHooks({
      root: "/workspace/lapis-plugin-tasks",
      fileExists: () => false,
    }).hooks.readPackage(manifest);

    assert.deepEqual(result, manifest);
  });
});
