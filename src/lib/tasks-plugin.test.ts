import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const repoRoot = resolve(sourceRoot, "../..");

describe("TasksPlugin stub", () => {
  it("keeps the runtime id and does not register views or commands", () => {
    const source = readFileSync(resolve(sourceRoot, "tasks-plugin.ts"), "utf8");
    const index = readFileSync(resolve(sourceRoot, "index.ts"), "utf8");
    const manifest = readFileSync(resolve(repoRoot, "manifest.json"), "utf8");
    const pkg = readFileSync(resolve(repoRoot, "package.json"), "utf8");

    expect(source).toContain('id: TASKS_PLUGIN_ID');
    expect(source).toContain("async onload()");
    expect(source).not.toContain("registerView");
    expect(source).not.toContain("addCommand");
    expect(source).not.toContain("addRibbonIcon");
    expect(source).not.toContain("addSettingTab");
    expect(index).toContain("TasksPlugin");
    expect(index).not.toContain("TaskDueCalendar");
    expect(manifest).toContain('"id": "tasks"');
    expect(manifest).toContain('"enabledByDefault": false');
    expect(pkg).not.toContain("@stevejuma/ui");
    expect(pkg).not.toContain("@lapis-server/");
    expect(pkg).not.toContain("@lapismd/mira");
    expect(pkg).not.toMatch(/"(?:workspace|link|file):/u);
  });
});
