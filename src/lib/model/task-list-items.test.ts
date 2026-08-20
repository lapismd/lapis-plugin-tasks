import { describe, expect, it } from "vitest";
import {
  replaceTaskListItemsSection,
  scanTaskListItemsSections,
  TaskListItemsMutationError,
} from "./task-list-items";

const frontMatter = `---
type: task-list
id: list-docs
list:
  status: active
---`;

describe("scanTaskListItemsSections", () => {
  it.each([
    ["top", `## Items\n- [One](one.md)\n\n# Docs\nAfter`],
    ["middle", `# Docs\nBefore\n\n## Items\n- [One](one.md)\n\n## Notes\nAfter`],
    ["bottom", `# Docs\nBefore\n\n## Items\n- [One](one.md)\n`],
  ])("retains a valid section at the %s", (_placement, body) => {
    const raw = `${frontMatter}\n${body}`;
    const [section] = scanTaskListItemsSections(raw, "lists/docs.md");
    expect(section?.source).toContain("## Items");
    expect(section?.entries).toMatchObject([{ label: "One", target: "one.md" }]);
    expect(raw.slice(section!.from, section!.to)).toBe(section!.source);
  });

  it("keeps multiple sections and exact authored order independently", () => {
    const raw = `${frontMatter}\n# Docs\n## Items\n- [Nested](nested/list.md)\n- [Missing](missing.md)\n## Notes\nText\n## Items\n- [Last](last.md)\n`;
    const sections = scanTaskListItemsSections(raw, "lists/docs.md");
    expect(sections.map((section) => section.entries.map((entry) => entry.label))).toEqual([
      ["Nested", "Missing"],
      ["Last"],
    ]);
  });

  it.each([
    "- [ ] Not a link row",
    "  - [Nested](nested.md)",
    "Paragraph",
    "```md\n- [Hidden](hidden.md)\n```",
  ])("fails closed for unsupported syntax: %s", (unsupported) => {
    const raw = `${frontMatter}\n# Docs\n## Items\n${unsupported}\n`;
    expect(scanTaskListItemsSections(raw)).toEqual([]);
  });
});

describe("replaceTaskListItemsSection", () => {
  it("rewrites only the selected section", () => {
    const raw = `${frontMatter}\n# Docs\nBefore\n## Items\n- [One](one.md)\n\n## Notes\nAfter\n`;
    const section = scanTaskListItemsSections(raw)[0]!;
    const next = replaceTaskListItemsSection(raw, section, [
      { label: "Two", target: "two.md" },
      { label: "One", target: "one.md" },
    ]);
    expect(next).toContain("Before\n## Items\n- [Two](two.md)\n- [One](one.md)");
    expect(next).toContain("## Notes\nAfter\n");
  });

  it("rejects a stale section", () => {
    const raw = `${frontMatter}\n# Docs\n## Items\n- [One](one.md)\n`;
    const section = scanTaskListItemsSections(raw)[0]!;
    expect(() =>
      replaceTaskListItemsSection(raw.replace("One", "Changed"), section, []),
    ).toThrowError(TaskListItemsMutationError);
  });
});
