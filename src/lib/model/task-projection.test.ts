import { describe, expect, it } from "vitest";
import { parseTaskDocument } from "./task-document";
import { projectTask } from "./task-projection";

describe("task recurrence projection", () => {
  it("projects durable recurrence, tracking, and date-sensitive effective fields", () => {
    const document = parseTaskDocument(
      `---
type: task
id: hydrate
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-18
    at: morning
  repeat:
    start: 2026-08-18
    rrule: FREQ=DAILY
    anchor: schedule
    missed: carry
  tracking:
    type: count
    unit: glasses
    target: 8
---
# Hydrate
`,
      "tasks/hydrate.md",
    );

    if (!document) throw new Error("expected task document");
    const row = projectTask(document, "2026-08-20");

    expect(row.projectionVersion).toBe(3);
    expect(row.repeat).toMatchObject({
      rrule: "FREQ=DAILY",
      anchor: "schedule",
      missed: "carry",
    });
    expect(row.tracking).toEqual({
      type: "count",
      unit: "glasses",
      target: 8,
    });
    expect(row.effectiveOccurrenceDate).toBe("2026-08-18");
    expect(row.effectiveOccurrenceState).toBe("overdue");
    expect(row.effectiveForDate).toBe("2026-08-20");
  });
});
