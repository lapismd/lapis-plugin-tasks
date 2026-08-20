import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  scanStructuralTaskRuns,
  structuralTaskRunEditorChange,
  type StructuralTaskTargetResolver,
} from "./model/task-list-items";

const DOCUMENT = `---
type: task-list
id: list-applications
list:
  status: active
---
# Applications

Before

## Items
- [One](../tasks/one.md)
- [Two](../tasks/two.md)

## Notes

After
`;

const resolve: StructuralTaskTargetResolver = (_source, href) => ({
  id: href,
  path: href,
  kind: "task",
  title: href,
});

function applyChange(
  source: string,
  change: { from: number; to: number; insert: string },
): string {
  return `${source.slice(0, change.from)}${change.insert}${source.slice(change.to)}`;
}

describe("task-list Markdown contribution", () => {
  it("keeps source mode literal and contributes a live-preview field", () => {
    const source = readFileSync(
      "src/lib/task-list-markdown-extension.ts",
      "utf8",
    );
    expect(source).toContain('mode === "live-preview"');
    expect(source).toContain("StateField.define<DecorationSet>");
    expect(source).toContain("EditorView.decorations.from(field)");
    expect(source).toContain("selectionTouchesSection");
    expect(source).toContain("ignoreEvent(): boolean");
    expect(source).toContain("return true");
    expect(source).toContain("sourceRunOrdinal");
    expect(source).toContain("ctx.addChild(child)");
    expect(source).toContain("scanMarkdownTaskRuns");
    expect(source).toContain("scanMarkdownTaskGroupHeadings");
    expect(source).toContain("Decoration.line");
    expect(source).toContain('"data-task-group-heading": "true"');
    expect(source).toContain("markRenderedTaskGroupHeadings");
    expect(source).toContain('ctx.frontmatter?.type !== "task-list-navigation"');
  });

  it("keeps rich Markdown rows inside the host and protects the Tasks checkbox", () => {
    const styles = readFileSync(
      "src/lib/task-list-items-block/TaskListItemsBlock.css",
      "utf8",
    );
    expect(styles).toContain(".task-list-items-block__header {\n  position: absolute;");
    expect(styles).toContain("inset-block-start: -2.9rem;");
    expect(styles).toContain("inset-inline-end: 0.5rem;");
    expect(styles).toContain(
      '.task-list-items-block[data-task-list-surface="markdown"]',
    );
    expect(styles).toContain("margin-inline: 0;");
    expect(styles).toContain(
      ".task-list-items-block [data-task-checkbox].task-checkbox input:checked::after",
    );
    expect(styles).toContain("mask: none;");

    const globalStyles = readFileSync("src/lib/styles.css", "utf8");
    expect(globalStyles).toContain('[data-task-group-heading="true"]');
    expect(globalStyles).toContain(
      "var(--ui-tasks-day-morning)",
    );
    expect(globalStyles).toContain(
      '.cm-editor .cm-line[data-task-group-heading="true"]',
    );
    expect(globalStyles).toContain("display: flex !important;");
    expect(globalStyles).toContain("padding: 0.45rem 0.75rem !important;");
  });

  it.each([
    {
      mutation: "create",
      entries: [
        { label: "One", target: "../tasks/one.md" },
        { label: "Two", target: "../tasks/two.md" },
        { label: "Three", target: "../tasks/three.md" },
      ],
      expected: ["One", "Two", "Three"],
    },
    {
      mutation: "reorder",
      entries: [
        { label: "Two", target: "../tasks/two.md" },
        { label: "One", target: "../tasks/one.md" },
      ],
      expected: ["Two", "One"],
    },
    {
      mutation: "delete",
      entries: [{ label: "Two", target: "../tasks/two.md" }],
      expected: ["Two"],
    },
  ])("transacts $mutation through the active editor without changing surrounding Markdown", ({
    entries,
    expected,
  }) => {
    const section = scanStructuralTaskRuns(
      DOCUMENT,
      "lists/applications.md",
      resolve,
    )[0]!;
    const next = applyChange(
      DOCUMENT,
      structuralTaskRunEditorChange(
        DOCUMENT,
        section,
        entries,
        "lists/applications.md",
      ),
    );

    expect(next.slice(0, section.from)).toBe(DOCUMENT.slice(0, section.from));
    expect(next).toContain("## Notes\n\nAfter\n");
    expect(
      scanStructuralTaskRuns(
        next,
        "lists/applications.md",
        resolve,
      )[0]!.entries.map(
        (entry) => entry.label,
      ),
    ).toEqual(expected);
  });
});
