import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Storybook theme contract", () => {
  it("offers the host brand picker and manager color-mode toggle", () => {
    const preview = readFileSync(".storybook/preview.ts", "utf8");
    const manager = readFileSync(".storybook/manager.ts", "utf8");
    const toggle = readFileSync(
      ".storybook/manager-color-mode-toggle.tsx",
      "utf8",
    );
    const shellStories = readFileSync(
      "src/stories/PluginWorkspace.stories.svelte",
      "utf8",
    );
    const quickCreateStyles = readFileSync(
      "src/lib/tasks/task-planner/TaskQuickCreateRow.css",
      "utf8",
    );

    expect(preview).toContain("globalTypes");
    expect(preview).toContain('icon: "paintbrush"');
    expect(preview).toContain('{ value: "lapis", title: "Obsidian" }');
    expect(preview).toContain('{ value: "default", title: "Default" }');
    expect(preview).toContain('colorMode: "light"');
    expect(preview).toContain('document.documentElement.classList.toggle(');
    expect(preview).toContain('context.globals.colorMode === "dark"');
    expect(manager).toContain('import "./manager-color-mode-toggle.js"');
    expect(toggle).toContain("useGlobals()");
    expect(toggle).toContain(
      'updateGlobals({ colorMode: isDark ? "light" : "dark" })',
    );
    expect(toggle).toContain("Switch to dark mode");
    expect(toggle).toContain("Switch to light mode");
    expect(shellStories).toContain('name="Obsidian Dark Contrast"');
    expect(shellStories).toContain('name="Default Dark Contrast"');
    expect(shellStories).toContain(
      'globals={{ theme: "lapis", colorMode: "dark" }}',
    );
    expect(shellStories).toContain(
      'globals={{ theme: "default", colorMode: "dark" }}',
    );
    expect(shellStories).toContain("computedContrastRatio");
    expect(shellStories).toContain("toBeGreaterThanOrEqual(4.5)");
    expect(shellStories).toContain("toBeGreaterThanOrEqual(3)");
    expect(quickCreateStyles).toContain(
      "border-color: var(--ui-tasks-accent-text)",
    );
  });
});
