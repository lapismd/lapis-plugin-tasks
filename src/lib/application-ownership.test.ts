import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (
      !entry.isFile() ||
      !/\.(?:svelte|ts)$/u.test(entry.name) ||
      /\.(?:test|spec)\.ts$/u.test(entry.name)
    ) {
      return [];
    }
    return [path];
  });
}

describe("application ownership", () => {
  it("keeps the ambient app alias out of production and Storybook source", () => {
    const violations = sourceFiles(sourceRoot).filter((path) =>
      readFileSync(path, "utf8").includes("globalThis.app"),
    );

    expect(violations).toEqual([]);
  });
});
