import { describe, expect, it } from "vitest";
import {
  resolveTaskDocumentStructure,
  scanTaskStructure,
  validateTaskStructureGraph,
  type TaskStructureTarget,
} from "./task-structure";

const frontmatter = `---
type: task
id: t_release
---`;

const targets: Record<string, TaskStructureTarget> = {
  "parser.md": {
    id: "t_parser",
    path: "parser.md",
    kind: "task",
    title: "Parser",
  },
  "tests.md": {
    id: "t_tests",
    path: "tests.md",
    kind: "task",
    title: "Tests",
  },
  "website.md": {
    id: "l_website",
    path: "website.md",
    kind: "task-list",
    title: "Website",
  },
  "nested.md": {
    id: "t_nested",
    path: "nested.md",
    kind: "task",
    title: "Nested",
  },
  "note.md": {
    id: "note.md",
    path: "note.md",
    kind: "unsupported",
    title: "Note",
  },
};

function resolve(_sourcePath: string, href: string) {
  return targets[href.replace(/^\.\//, "").split("#")[0]!] ?? null;
}

describe("scanTaskStructure", () => {
  it("captures root, nested-heading, and nested-list candidates with absolute ranges", () => {
    const raw = `${frontmatter}

# Release

- [Parser](./parser.md)

## Development

Context.

- [Tests](./tests.md)
- Supporting work
  - [Nested](./nested.md)

### Web

* [Website](./website.md)
`;
    const scanned = scanTaskStructure(raw, {
      documentId: "t_release",
      documentPath: "release.md",
      documentKind: "task",
    });

    expect(
      scanned.candidates.map((entry) => ({
        label: entry.authoredLabel,
        path: entry.heading.path,
        level: entry.heading.level,
        depth: entry.listDepth,
        source: raw.slice(entry.sourceStart, entry.sourceEnd),
      })),
    ).toEqual([
      {
        label: "Parser",
        path: [],
        level: null,
        depth: 0,
        source: "- [Parser](./parser.md)",
      },
      {
        label: "Tests",
        path: ["Development"],
        level: 2,
        depth: 0,
        source: "- [Tests](./tests.md)",
      },
      {
        label: "Nested",
        path: ["Development"],
        level: 2,
        depth: 1,
        source: "- [Nested](./nested.md)",
      },
      {
        label: "Website",
        path: ["Development", "Web"],
        level: 3,
        depth: 0,
        source: "* [Website](./website.md)",
      },
    ]);
  });

  it("keeps ordered, checkbox, external, fragment-only, and rich items ordinary", () => {
    const raw = `${frontmatter}

# Release

1. [Ordered](./parser.md)
- [ ] Lightweight item
- See [Parser](./parser.md)
- [External](https://example.com)
- [Section](#development)
- [Parser](./parser.md) — notes
`;
    const scanned = scanTaskStructure(raw, {
      documentId: "t_release",
      documentPath: "release.md",
      documentKind: "task",
    });
    expect(scanned.candidates).toEqual([]);
    expect(scanned.checklist).toMatchObject([
      { text: "Lightweight item", checked: false, position: 0 },
    ]);
  });

  it("does not project task-list checkboxes as Task progress", () => {
    const raw = `${frontmatter.replace("type: task", "type: task-list")}

- [ ] Markdown-owned
`;
    const scanned = scanTaskStructure(raw, {
      documentId: "t_release",
      documentPath: "release.md",
      documentKind: "task-list",
    });
    expect(scanned.checklist).toEqual([]);
  });

  it("retains derived heading context for lightweight Task checklists", () => {
    const raw = `${frontmatter}

# Release

- [ ] Root item

## Preparation

- [x] Confirm scope

### Review

- [ ] Share notes
`;
    const scanned = scanTaskStructure(raw, {
      documentId: "t_release",
      documentPath: "release.md",
      documentKind: "task",
    });

    expect(
      scanned.checklist.map((item) => ({
        text: item.text,
        path: item.heading.path,
        level: item.heading.level,
        headingSource:
          item.heading.sourceStart == null || item.heading.sourceEnd == null
            ? null
            : raw.slice(item.heading.sourceStart, item.heading.sourceEnd),
      })),
    ).toEqual([
      { text: "Root item", path: [], level: null, headingSource: null },
      {
        text: "Confirm scope",
        path: ["Preparation"],
        level: 2,
        headingSource: "## Preparation",
      },
      {
        text: "Share notes",
        path: ["Preparation", "Review"],
        level: 3,
        headingSource: "### Review",
      },
    ]);
  });
});

describe("resolveTaskDocumentStructure", () => {
  it("allows every Task/List source and target combination", async () => {
    for (const documentKind of ["task", "task-list"] as const) {
      const raw = `---\ntype: ${documentKind}\nid: source\n---\n\n- [Parser](./parser.md)\n- [Website](./website.md)\n`;
      const structure = await resolveTaskDocumentStructure(
        raw,
        {
          documentId: `source-${documentKind}`,
          documentPath: `${documentKind}.md`,
          documentKind,
        },
        resolve,
      );
      expect(structure.entries.map((entry) => entry.kind)).toEqual([
        "task-entry",
        "list-entry",
      ]);
    }
  });

  it("classifies target types and splits runs around unresolved candidates and prose", async () => {
    const raw = `${frontmatter}

# Release

## Development

- [Parser](./parser.md)
- [Missing](./missing.md)
- [Tests](./tests.md)

Compatibility notes.

- [Website](./website.md)
`;
    const structure = await resolveTaskDocumentStructure(
      raw,
      {
        documentId: "t_release",
        documentPath: "release.md",
        documentKind: "task",
      },
      resolve,
    );

    expect(structure.runs.map((run) => run.entries.map((entry) => entry.kind))).toEqual([
      ["task-entry"],
      ["task-entry"],
      ["list-entry"],
    ]);
    expect(structure.entries.map((entry) => entry.headingPath)).toEqual([
      ["Development"],
      ["Development"],
      ["Development"],
    ]);
    expect(structure.diagnostics).toMatchObject([
      { code: "unresolved-structural-link", target: "./missing.md" },
    ]);
  });

  it("keeps contiguous mixed Task/List siblings in one run", async () => {
    const raw = `${frontmatter}

## Current Work

- [Parser](./parser.md)
- [Website](./website.md)
- [Tests](./tests.md)
`;
    const structure = await resolveTaskDocumentStructure(
      raw,
      {
        documentId: "t_release",
        documentPath: "release.md",
        documentKind: "task",
      },
      resolve,
    );
    expect(structure.runs).toHaveLength(1);
    expect(structure.runs[0]?.entries.map((entry) => entry.kind)).toEqual([
      "task-entry",
      "list-entry",
      "task-entry",
    ]);
    expect(structure.runs[0]?.source).toContain("[Website](./website.md)");
  });

  it("diagnoses an existing non-Task target separately from a missing file", async () => {
    const raw = `${frontmatter}\n\n- [Note](./note.md)\n- [Missing](./missing.md)\n`;
    const structure = await resolveTaskDocumentStructure(
      raw,
      {
        documentId: "t_release",
        documentPath: "release.md",
        documentKind: "task",
      },
      resolve,
    );
    expect(structure.entries).toEqual([]);
    expect(structure.diagnostics).toMatchObject([
      { code: "unsupported-structural-target", target: "./note.md" },
      { code: "unresolved-structural-link", target: "./missing.md" },
    ]);
  });
});

describe("validateTaskStructureGraph", () => {
  async function structure(
    id: string,
    path: string,
    links: Array<{ label: string; href: string; target: TaskStructureTarget }>,
    kind: "task" | "task-list" = "task-list",
  ) {
    const raw = `---\ntype: ${kind}\nid: ${id}\n---\n\n${links
      .map(({ label, href }) => `- [${label}](${href})`)
      .join("\n")}\n`;
    return resolveTaskDocumentStructure(
      raw,
      { documentId: id, documentPath: path, documentKind: kind },
      (_source, href) => links.find((link) => link.href === href)?.target ?? null,
    );
  }

  it("rejects every conflicting edge when a target has multiple structural parents", async () => {
    const child = {
      id: "t_child",
      path: "child.md",
      kind: "task" as const,
      title: "Child",
    };
    const first = await structure("l_first", "first.md", [
      { label: "Child", href: "child.md", target: child },
    ]);
    const second = await structure("t_second", "second.md", [
      { label: "Child", href: "child.md", target: child },
    ], "task");
    const validated = validateTaskStructureGraph([first, second]);

    expect(validated.get("first.md")?.entries).toEqual([]);
    expect(validated.get("second.md")?.entries).toEqual([]);
    expect(validated.get("first.md")?.diagnostics).toMatchObject([
      { code: "multiple-structural-parents", target: "child.md" },
    ]);
    expect(validated.get("second.md")?.diagnostics).toMatchObject([
      { code: "multiple-structural-parents", target: "child.md" },
    ]);
  });

  it("rejects all edges in recursive cycles, including Task to List and self-links", async () => {
    const listTarget = {
      id: "l_list",
      path: "list.md",
      kind: "task-list" as const,
      title: "List",
    };
    const taskTarget = {
      id: "t_task",
      path: "task.md",
      kind: "task" as const,
      title: "Task",
    };
    const list = await structure("l_list", "list.md", [
      { label: "Task", href: "task.md", target: taskTarget },
    ]);
    const task = await structure("t_task", "task.md", [
      { label: "List", href: "list.md", target: listTarget },
    ], "task");
    const self = await structure("l_self", "self.md", [
      {
        label: "Self",
        href: "self.md",
        target: {
          id: "l_self",
          path: "self.md",
          kind: "task-list",
          title: "Self",
        },
      },
    ]);
    const validated = validateTaskStructureGraph([list, task, self]);

    expect(validated.get("list.md")?.entries).toEqual([]);
    expect(validated.get("task.md")?.entries).toEqual([]);
    expect(validated.get("self.md")?.entries).toEqual([]);
    expect(
      [...validated.values()].flatMap((value) => value.diagnostics),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "structural-cycle", target: "task.md" }),
        expect.objectContaining({ code: "structural-cycle", target: "list.md" }),
        expect.objectContaining({ code: "structural-cycle", target: "self.md" }),
      ]),
    );
  });

  it("retains duplicate occurrences from the same structural parent", async () => {
    const child = {
      id: "t_child",
      path: "child.md",
      kind: "task" as const,
      title: "Child",
    };
    const parent = await structure("l_parent", "parent.md", [
      { label: "Child", href: "child.md", target: child },
      { label: "Child again", href: "child.md", target: child },
    ]);
    const validated = validateTaskStructureGraph([parent]);
    expect(validated.get("parent.md")?.entries).toHaveLength(2);
    expect(validated.get("parent.md")?.diagnostics).toEqual([]);
  });
});
