import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(fileURLToPath(new URL(".", import.meta.url)));
const repoRoot = resolve(sourceRoot, "../..");
const notesRoot = resolve(repoRoot, "../lapis-notes");

describe("TasksPlugin", () => {
  it("registers the planner view from onload and keeps hosts from registering it", () => {
    const source = readFileSync(resolve(sourceRoot, "tasks-plugin.ts"), "utf8");
    const settingsTab = readFileSync(
      resolve(sourceRoot, "tasks-settings-tab.ts"),
      "utf8",
    );
    const index = readFileSync(resolve(sourceRoot, "index.ts"), "utf8");
    const view = readFileSync(resolve(sourceRoot, "tasks-view.ts"), "utf8");
    const manifest = readFileSync(resolve(repoRoot, "manifest.json"), "utf8");
    const pkg = readFileSync(resolve(repoRoot, "package.json"), "utf8");
    const desktop = readFileSync(
      resolve(
        notesRoot,
        "packages/desktop-electron/src/DesktopWorkspaceSession.svelte",
      ),
      "utf8",
    );
    const web = readFileSync(
      resolve(notesRoot, "packages/web/src/WebWorkspaceSession.svelte"),
      "utf8",
    );

    expect(source).toContain("id: TASKS_PLUGIN_ID");
    expect(source).toContain("async onload()");
    expect(source).toContain("registerIndexProjection");
    expect(source).toContain("registerMarkdownExtension");
    expect(source).toContain("createTaskStructureMarkdownContribution");
    expect(source).toContain("registerView");
    expect(source).toContain("TASKS_VIEW_TYPE");
    expect(source).toContain('id: "open"');
    expect(source).toContain("addRibbonIcon");
    expect(source).toContain("await this.loadData()");
    expect(source).toContain("this.saveData(snapshot)");
    expect(source).toContain("addSettingTab");
    expect(settingsTab).toContain('.setName("Navigation column")');
    expect(settingsTab).toContain('.addOption("expanded", "Expanded")');
    expect(settingsTab).toContain('.addOption("collapsed", "Collapsed")');
    expect(settingsTab).toContain('.addOption("hidden", "Hidden")');
    expect(source).toContain("registerTasksWorkspaceSettings(this)");
    expect(source).toContain("refreshEffectiveOccurrences");
    expect(source).toContain('"visibilitychange"');
    expect(source).toContain('"pageshow"');
    expect(source).toContain("scheduleLocalDateRefresh");
    expect(view).toContain('export const TASKS_VIEW_TYPE = "tasks"');
    expect(index).toContain("TasksPlugin");
    expect(index).toContain("TasksView");
    expect(index).toContain("TASKS_VIEW_TYPE");
    expect(index).not.toContain("TaskDueCalendar");
    expect(manifest).toContain('"id": "tasks"');
    expect(manifest).toContain('"enabledByDefault": true');
    const manifestJson = JSON.parse(pkg) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const runtimeDeps = {
      ...manifestJson.dependencies,
      ...manifestJson.peerDependencies,
    };
    expect(Object.keys(runtimeDeps).join("\n")).not.toContain("@stevejuma/ui");
    expect(Object.keys(runtimeDeps).join("\n")).not.toContain("@lapis-server/");
    expect(Object.keys(runtimeDeps).join("\n")).not.toContain("@lapismd/mira");
    expect(Object.keys(runtimeDeps).join("\n")).not.toContain(
      "@lapis-notes/markdown",
    );
    expect(pkg).not.toMatch(/"(?:workspace|link|file):/u);
    expect(desktop).toContain("TasksPlugin");
    expect(web).toContain("TasksPlugin");
    expect(desktop).not.toContain("registerView");
    expect(web).not.toContain("registerView");
  });
});
