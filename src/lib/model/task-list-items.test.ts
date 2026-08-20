import { describe, expect, it } from "vitest";
import {
  addStructuralEntryUnderHeading,
  createTaskHeading,
  moveStructuralTaskEntryEditorChanges,
  replaceStructuralTaskRun,
  scanMarkdownTaskRuns,
  renameTaskHeading,
  scanStructuralTaskRuns,
  structuralTaskRunEditorChange,
  StructuralTaskRunMutationError,
  type StructuralTaskTargetResolver,
} from "./task-list-items";

const frontMatter = `---\ntype: task-list\nid: l_docs\n---`;
const resolve: StructuralTaskTargetResolver = (_source, href) => {
  const path = href.replace(/^\.\//, "");
  if (path === "note.md" || path === "missing.md") return null;
  return {
    id: path.startsWith("list-") ? `l_${path}` : `t_${path}`,
    path,
    kind: path.startsWith("list-") ? "task-list" : "task",
    title: path,
  };
};

describe("scanStructuralTaskRuns", () => {
  it("finds root and headed runs without consuming headings or prose", () => {
    const raw = `${frontMatter}\n\n# Docs\n\n- [Root](root.md)\n\n## Development\n\n- [Parser](parser.md)\n\nContext.\n\n- [Tests](tests.md)\n- [Website](list-website.md)\n\n## Notes\n\n- [Reference](note.md)\n`;
    const runs = scanStructuralTaskRuns(raw, "lists/docs.md", resolve);
    expect(
      runs.map((run) => ({
        heading: run.headingPath,
        source: run.source,
        kinds: run.entries.map((entry) => entry.kind),
      })),
    ).toEqual([
      { heading: [], source: "- [Root](root.md)", kinds: ["task-entry"] },
      {
        heading: ["Development"],
        source: "- [Parser](parser.md)",
        kinds: ["task-entry"],
      },
      {
        heading: ["Development"],
        source: "- [Tests](tests.md)\n- [Website](list-website.md)",
        kinds: ["task-entry", "list-entry"],
      },
    ]);
  });

  it("splits around unresolved and ordinary list items", () => {
    const raw = `${frontMatter}\n\n## Work\n\n- [One](one.md)\n- [Missing](missing.md)\n- Explanation with [link](two.md)\n- [Two](two.md)\n`;
    expect(
      scanStructuralTaskRuns(raw, "lists/docs.md", resolve).map((run) =>
        run.entries.map((entry) => entry.label),
      ),
    ).toEqual([["One"], ["Two"]]);
  });

  it("keeps navigation links presentation-only while exposing linked Lists to Markdown", () => {
    const raw = `---
type: task-list-navigation
id: lists-nav
---
# Lists

## Work
- [Applications](./lists/applications.md)
- [Follow up](./tasks/follow-up.md)
`;
    const resolveNavigation: StructuralTaskTargetResolver = (_source, href) =>
      href.includes("applications")
        ? {
            id: "list-applications",
            path: "lists/applications.md",
            kind: "task-list",
            title: "Applications",
          }
        : {
            id: "task-follow-up",
            path: "tasks/follow-up.md",
            kind: "task",
            title: "Follow up",
          };

    expect(scanStructuralTaskRuns(raw, "lists.md", resolveNavigation)).toEqual(
      [],
    );
    expect(
      scanMarkdownTaskRuns(raw, "lists.md", resolveNavigation).map((run) => ({
        heading: run.headingPath,
        entries: run.entries.map((entry) => ({
          label: entry.label,
          kind: entry.kind,
          targetPath: entry.targetPath,
        })),
      })),
    ).toEqual([
      {
        heading: ["Work"],
        entries: [
          {
            label: "Applications",
            kind: "list-entry",
            targetPath: "lists/applications.md",
          },
        ],
      },
    ]);
  });
});

describe("heading and cross-run mutations", () => {
  it("renames and creates ordinary Markdown headings without touching their content", () => {
    const raw = `${frontMatter}\n\n# Docs\n\n## Development\n\nContext.\n`;
    expect(renameTaskHeading(raw, ["Development"], "Engineering")).toBe(
      raw.replace("## Development", "## Engineering"),
    );
    expect(createTaskHeading(raw, "Launch")).toBe(
      `${raw.trimEnd()}\n\n## Launch\n`,
    );
  });

  it("adds an entry at the selected heading boundary and preserves prose", () => {
    const raw = `${frontMatter}\n\n# Docs\n\n## Development\n\nContext.\n\n## Launch\n\nLater.\n`;
    expect(
      addStructuralEntryUnderHeading(raw, ["Development"], {
        label: "Parser",
        target: "parser.md",
      }),
    ).toBe(
      `${frontMatter}\n\n# Docs\n\n## Development\n\nContext.\n\n- [Parser](parser.md)\n## Launch\n\nLater.\n`,
    );
  });

  it("returns two narrow changes when explicitly moving between runs", () => {
    const raw = `${frontMatter}\n\n## Development\n\n- [One](one.md)\n- [Two](two.md)\n\nContext.\n\n## Launch\n\n- [Three](three.md)\n`;
    const [sourceRun, targetRun] = scanStructuralTaskRuns(
      raw,
      "lists/docs.md",
      resolve,
    );
    const changes = moveStructuralTaskEntryEditorChanges(
      raw,
      sourceRun!,
      1,
      targetRun!,
      0,
    );
    const next = [...changes]
      .sort((left, right) => right.from - left.from)
      .reduce(
        (value, change) =>
          `${value.slice(0, change.from)}${change.insert}${value.slice(change.to)}`,
        raw,
      );
    expect(next).toContain("## Development\n\n- [One](one.md)\n\nContext.");
    expect(next).toContain(
      "## Launch\n\n- [Two](two.md)\n- [Three](three.md)",
    );
  });
});

describe("replaceStructuralTaskRun", () => {
  it("reorders only one contiguous run and preserves surrounding Markdown exactly", () => {
    const raw = `${frontMatter}\n\n## Work\n\nBefore.\n\n* [One](one.md)\n* [Two](two.md)\n\nAfter.\n`;
    const run = scanStructuralTaskRuns(raw, "lists/docs.md", resolve)[0]!;
    const next = replaceStructuralTaskRun(
      raw,
      run,
      [run.entries[1]!, run.entries[0]!],
      "lists/docs.md",
    );
    expect(next).toBe(
      `${frontMatter}\n\n## Work\n\nBefore.\n\n* [Two](two.md)\n* [One](one.md)\n\nAfter.\n`,
    );
  });

  it("returns the exact CodeMirror change for a run", () => {
    const raw = `${frontMatter}\n\n- [One](one.md)\n- [Two](two.md)\n`;
    const run = scanStructuralTaskRuns(raw, "lists/docs.md", resolve)[0]!;
    expect(
      structuralTaskRunEditorChange(
        raw,
        run,
        [run.entries[1]!, run.entries[0]!],
        "lists/docs.md",
      ),
    ).toEqual({
      from: run.from,
      to: run.to,
      insert: "- [Two](two.md)\n- [One](one.md)",
    });
  });

  it("rejects stale runs without rewriting nearby content", () => {
    const raw = `${frontMatter}\n\n- [One](one.md)\n`;
    const run = scanStructuralTaskRuns(raw, "lists/docs.md", resolve)[0]!;
    expect(() =>
      replaceStructuralTaskRun(
        raw.replace("One", "Changed"),
        run,
        [],
        "lists/docs.md",
      ),
    ).toThrowError(StructuralTaskRunMutationError);
  });
});
