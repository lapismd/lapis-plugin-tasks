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
  });
});
