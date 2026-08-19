import { describe, expect, it } from "vitest";
import { parseTaskDocument, serializeTaskDocument } from "./task-document";

const SIMPLE_TASK = `---
type: task
id: t_buy_filter
task:
  status: open
  start: anytime
---

# Buy replacement water filter
Check the model number before ordering.
`;

const PLANNED_TASK = `---
type: task
id: t_release
task:
  status: open
  inbox: false
  start: anytime
  plan:
    date: 2026-08-21
    at: anytime
    duration: 45m
  deadline: 2026-08-24
---

# Finish release notes
`;

const PROJECT_TASK = `---
type: task
id: t_release_v2
task:
  status: open
  start: anytime
---

# Release version 2
## Checklist
- [x] Confirm version
- [ ] Write changelog
## Subtasks
- [Finish migration](./finish-migration.md)
- [Write docs](./write-docs.md)
See [Prepare deployment](./prepare-deployment.md) for background.
`;

const NESTED_LIST = `---
type: task-list
id: l_work
list:
  status: active
---

# Work
## Items
- [Current projects](./current-projects.md)
- [Submit expenses](../tasks/submit-expenses.md)
`;

describe("parseTaskDocument", () => {
  it("parses a one-off task from front matter and H1", () => {
    const document = parseTaskDocument(SIMPLE_TASK, "buy.md");
    expect(document).toMatchObject({
      kind: "task",
      id: "t_buy_filter",
      title: "Buy replacement water filter",
      task: { status: "open", start: { kind: "anytime" }, inbox: false },
    });
  });

  it("parses plan, duration, and deadline independently", () => {
    const document = parseTaskDocument(PLANNED_TASK, "notes.md");
    expect(document?.kind).toBe("task");
    if (document?.kind !== "task") return;
    expect(document.task.plan).toMatchObject({
      date: "2026-08-21",
      at: "anytime",
      durationMinutes: 45,
    });
    expect(document.task.deadline).toBe("2026-08-24");
  });

  it("indexes checklist aggregates and structural subtask links", () => {
    const document = parseTaskDocument(PROJECT_TASK, "release.md");
    expect(document?.kind).toBe("task");
    if (document?.kind !== "task") return;
    expect(document.checklist).toEqual([
      { text: "Confirm version", checked: true, position: 0 },
      { text: "Write changelog", checked: false, position: 1 },
    ]);
    expect(document.structuralLinks.map((link) => link.kind)).toEqual([
      "subtask",
      "subtask",
    ]);
    expect(document.structuralLinks[0]).toMatchObject({
      title: "Finish migration",
      href: "./finish-migration.md",
    });
  });

  it("parses nested task-list items", () => {
    const document = parseTaskDocument(NESTED_LIST, "work.md");
    expect(document).toMatchObject({
      kind: "task-list",
      id: "l_work",
      title: "Work",
      list: { status: "active" },
    });
    if (document?.kind !== "task-list") return;
    expect(document.structuralLinks.map((link) => link.href)).toEqual([
      "./current-projects.md",
      "../tasks/submit-expenses.md",
    ]);
    expect(document.structuralLinks.every((link) => link.kind === "list-item")).toBe(
      true,
    );
  });

  it("round-trips nested task front matter", () => {
    const parsed = parseTaskDocument(PLANNED_TASK, "notes.md");
    expect(parsed).not.toBeNull();
    const raw = serializeTaskDocument(parsed!);
    const again = parseTaskDocument(raw, "notes.md");
    expect(again).toMatchObject({
      id: "t_release",
      kind: "task",
    });
    if (again?.kind !== "task") return;
    expect(again.task.plan?.date).toBe("2026-08-21");
    expect(again.task.deadline).toBe("2026-08-24");
  });

  it("parses a navigation document as presentation pins", () => {
    const document = parseTaskDocument(
      `---
type: task-list-navigation
id: lists-nav
---
# Lists

## Items
- [Home](./lists/home.md)

## Work
- [Docs](./lists/docs.md)
`,
      "lists.md",
    );
    expect(document).toMatchObject({
      kind: "task-list-navigation",
      id: "lists-nav",
      title: "Lists",
    });
    expect(document?.structuralLinks).toEqual([
      {
        title: "Home",
        href: "./lists/home.md",
        kind: "navigation-item",
        heading: "Items",
        ordinal: 0,
      },
      {
        title: "Docs",
        href: "./lists/docs.md",
        kind: "navigation-item",
        heading: "Work",
        ordinal: 0,
      },
    ]);
  });

  it("rejects someday plus an active plan", () => {
    const document = parseTaskDocument(
      `---
type: task
id: t_bad
task:
  status: open
  start: someday
  plan:
    date: 2026-08-21
---
# Bad
`,
      "bad.md",
    );
    expect(document?.diagnostics.some((item) => item.code === "someday-plan")).toBe(
      true,
    );
  });
});
