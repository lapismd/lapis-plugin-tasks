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

  it("indexes lightweight checkboxes anywhere and captures link candidates", () => {
    const document = parseTaskDocument(PROJECT_TASK, "release.md");
    expect(document?.kind).toBe("task");
    if (document?.kind !== "task") return;
    expect(document.checklist).toMatchObject([
      { text: "Confirm version", checked: true, position: 0 },
      { text: "Write changelog", checked: false, position: 1 },
    ]);
    expect(document.structuralLinks.map((link) => link.kind)).toEqual([
      "reference",
      "reference",
    ]);
    expect(document.structuralLinks[0]).toMatchObject({
      title: "Finish migration",
      href: "./finish-migration.md",
    });
  });

  it("captures task-list link candidates without assigning target kinds", () => {
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
    expect(document.structuralLinks.every((link) => link.kind === "reference")).toBe(
      true,
    );
  });

  it("uses a list page title before its H1 and normalizes an id fallback", () => {
    const titled = parseTaskDocument(
      `---
type: task-list
id: list-docs
title: Documentation
list:
  status: active
---
# Docs
`,
      "lists/docs.md",
    );
    expect(titled).toMatchObject({
      kind: "task-list",
      title: "Documentation",
      frontMatterTitle: "Documentation",
    });
    expect(serializeTaskDocument(titled!)).toContain("title: Documentation");

    const heading = parseTaskDocument(
      `---
type: task-list
id: list-docs
list:
  status: active
---
# Docs
`,
      "lists/docs.md",
    );
    expect(heading).toMatchObject({ kind: "task-list", title: "Docs" });

    const fallback = parseTaskDocument(
      `---
type: task-list
id: list-docs
list:
  status: active
---
List notes without a heading.
`,
      "lists/docs.md",
    );
    expect(fallback).toMatchObject({ kind: "task-list", title: "List Docs" });
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

  it("parses morning, afternoon, and clock plan.at values", () => {
    for (const [at, expected] of [
      ["morning", { at: "morning" }],
      ["afternoon", { at: "afternoon" }],
      ["09:30", { at: "time", time: "09:30" }],
    ] as const) {
      const document = parseTaskDocument(
        `---
type: task
id: t_plan
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-20
    at: ${at}
---
# Planned
`,
        "planned.md",
      );
      expect(document?.kind).toBe("task");
      if (document?.kind !== "task") return;
      expect(document.task.plan).toMatchObject({
        date: "2026-08-20",
        ...expected,
      });
      const roundTrip = parseTaskDocument(
        serializeTaskDocument(document),
        "planned.md",
      );
      expect(roundTrip?.kind).toBe("task");
      if (roundTrip?.kind !== "task") return;
      expect(roundTrip.task.plan).toMatchObject({
        date: "2026-08-20",
        ...expected,
      });
    }
  });

  it("loads all-day plan.at as anytime with a diagnostic", () => {
    const document = parseTaskDocument(
      `---
type: task
id: t_all_day
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-20
    at: all-day
---
# Conference notes
`,
      "all-day.md",
    );
    expect(document?.kind).toBe("task");
    if (document?.kind !== "task") return;
    expect(document.task.plan).toMatchObject({
      date: "2026-08-20",
      at: "anytime",
    });
    expect(
      document.diagnostics.some((item) => item.code === "invalid-plan-at"),
    ).toBe(true);
    const raw = serializeTaskDocument(document);
    expect(raw).toContain("at: anytime");
    expect(raw).not.toContain("all-day");
  });

  it("parses and round-trips the RRULE and tracking contracts", () => {
    const document = parseTaskDocument(
      `---
type: task
id: t_habit
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-21
    at: morning
  repeat:
    start: 2026-08-21
    rrule: FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=12
    anchor: schedule
    missed: carry
    rdate: [2026-08-22]
    exdate: [2026-08-24]
    resetChecklist: true
    paused: false
    pauseRanges:
      - start: 2026-08-10
        end: 2026-08-12
    completionCount: 2
  tracking:
    type: count
    unit: glasses
    target: 8
---
# Drink water
`,
      "habit.md",
    );
    expect(document?.kind).toBe("task");
    if (document?.kind !== "task") return;
    expect(document.task.repeat).toMatchObject({
      start: "2026-08-21",
      rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=12",
      anchor: "schedule",
      missed: "carry",
      rdate: ["2026-08-22"],
      exdate: ["2026-08-24"],
      pauseRanges: [{ start: "2026-08-10", end: "2026-08-12" }],
      completionCount: 2,
    });
    expect(document.task.tracking).toEqual({
      type: "count",
      unit: "glasses",
      target: 8,
    });
    const again = parseTaskDocument(
      serializeTaskDocument(document),
      "habit.md",
    );
    expect(again?.kind).toBe("task");
    if (again?.kind !== "task") return;
    expect(again.task.repeat).toEqual(document.task.repeat);
    expect(again.task.tracking).toEqual(document.task.tracking);
  });

  it("preserves unsupported RRULE values while diagnosing and blocking execution", () => {
    const raw = `---
type: task
id: t_hourly
task:
  status: open
  start: anytime
  repeat:
    start: 2026-08-21
    rrule: FREQ=HOURLY;BYMINUTE=15
    anchor: schedule
    missed: carry
---
# Unsupported
`;
    const document = parseTaskDocument(raw, "unsupported.md");
    expect(document?.kind).toBe("task");
    if (document?.kind !== "task") return;
    expect(document.task.repeat?.rrule).toBe("FREQ=HOURLY;BYMINUTE=15");
    expect(document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "unsupported-repeat-rule" }),
    );
    expect(serializeTaskDocument(document)).toContain(
      "rrule: FREQ=HOURLY;BYMINUTE=15",
    );
  });

  it("retains legacy and invalid recurrence blocks opaquely during round-trip", () => {
    for (const [repeat, code] of [
      ["frequency: daily\n    interval: 1", "legacy-repeat"],
      ["rrule: FREQ=DAILY;COUNT=2;UNTIL=20260830\n    anchor: schedule", "invalid-repeat"],
    ] as const) {
      const raw = `---
type: task
id: t_legacy
task:
  status: open
  start: anytime
  repeat:
    ${repeat}
---
# Legacy
`;
      const document = parseTaskDocument(raw, "legacy.md");
      expect(document?.kind).toBe("task");
      if (document?.kind !== "task") return;
      expect(document.task.repeat).toBeUndefined();
      expect(document.task.unparsedRepeat).toBeDefined();
      expect(document.diagnostics.some((item) => item.code === code)).toBe(true);
      const serialized = serializeTaskDocument(document);
      expect(serialized).toContain(repeat.split("\n")[0]!);
    }
  });

  it("requires recurrence for tracking and validates quantitative targets", () => {
    const document = parseTaskDocument(
      `---
type: task
id: t_tracking
task:
  status: open
  start: anytime
  tracking:
    type: number
    unit: km
    target: 0
---
# Invalid tracking
`,
      "tracking.md",
    );
    expect(document?.kind).toBe("task");
    if (document?.kind !== "task") return;
    expect(document.task.tracking).toBeUndefined();
    expect(document.task.unparsedTracking).toBeDefined();
    expect(document.diagnostics).toContainEqual(
      expect.objectContaining({ code: "tracking-without-repeat" }),
    );
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
