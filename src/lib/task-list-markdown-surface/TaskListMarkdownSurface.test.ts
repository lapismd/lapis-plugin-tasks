import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TaskMarkdownSurface", () => {
  it("mounts the real file provider and retains a governed read-only fallback", () => {
    const source = readFileSync(
      "src/lib/task-list-markdown-surface/TaskListMarkdownSurface.svelte",
      "utf8",
    );
    expect(source).toContain("surfaceApp.markdownFileSurfaces.mount");
    expect(source).toContain('activation: "manual"');
    expect(source).toContain("export function enter()");
    expect(source).toContain("export async function exit()");
    expect(source).toContain("returnToPreviewOnBlur: false");
    expect(source).toContain(
      'surface: { id: "tasks-markdown", context: surfaceController }',
    );
    expect(source).toContain("target === mountedTarget");
    expect(source).toContain("sourcePath === mountedSourcePath");
    expect(source).toContain("disposeMountedSurface?.()");
    expect(source).toContain("disposeMountedSurface = untrack(() =>");
    expect(source).toContain("MarkdownRenderer.render");
    expect(source).toContain("Open note");
    expect(source).toContain("task-list-markdown-surface--editing");
  });
});
