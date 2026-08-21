import { describe, expect, it } from "vitest";
import { parseTaskDocument } from "./task-document";
import {
  matchesTaskView,
  taskDocumentToSummary,
} from "./task-queries";

const TODAY = "2026-08-20";

function summaryFrom(raw: string, path = "task.md") {
  const document = parseTaskDocument(raw, path);
  if (!document) throw new Error("expected document");
  return taskDocumentToSummary(document, TODAY);
}

describe("task view queries", () => {
  it("places inbox, today, anytime, someday, and overdue review correctly", () => {
    const inbox = summaryFrom(`---
type: task
id: t1
task:
  status: open
  inbox: true
  start: anytime
---
# Capture
`);
    const today = summaryFrom(`---
type: task
id: t2
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-19
    at: anytime
  deadline: 2026-08-24
---
# Overdue plan
`);
    const anytime = summaryFrom(`---
type: task
id: t3
task:
  status: open
  start: anytime
---
# Anytime
`);
    const someday = summaryFrom(`---
type: task
id: t4
task:
  status: open
  start: someday
---
# Later
`);
    const completed = summaryFrom(`---
type: task
id: t5
task:
  status: completed
  start: anytime
---
# Completed
`);
    const canceled = summaryFrom(`---
type: task
id: t6
task:
  status: canceled
  start: anytime
---
# Canceled
`);
    expect(matchesTaskView(inbox, "inbox", TODAY)).toBe(true);
    expect(matchesTaskView(today, "today", TODAY)).toBe(true);
    expect(matchesTaskView(today, "review", TODAY)).toBe(true);
    expect(matchesTaskView(anytime, "anytime", TODAY)).toBe(true);
    expect(matchesTaskView(someday, "someday", TODAY)).toBe(true);
    expect(matchesTaskView(today, "anytime", TODAY)).toBe(false);
    expect(matchesTaskView(completed, "completed", TODAY)).toBe(true);
    expect(matchesTaskView(canceled, "completed", TODAY)).toBe(false);
    expect(matchesTaskView(completed, "logbook", TODAY)).toBe(true);
    expect(matchesTaskView(canceled, "logbook", TODAY)).toBe(true);
  });

  it("uses one effective occurrence for carry, skip, and upcoming views", () => {
    const carry = summaryFrom(`---
type: task
id: carry
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-18
    at: anytime
  repeat:
    start: 2026-08-18
    rrule: FREQ=DAILY
    anchor: schedule
    missed: carry
---
# Carry
`);
    const skip = summaryFrom(`---
type: task
id: skip
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-18
    at: anytime
  repeat:
    start: 2026-08-18
    rrule: FREQ=DAILY;INTERVAL=3
    anchor: schedule
    missed: skip
---
# Skip
`);
    const future = summaryFrom(`---
type: task
id: future
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-22
    at: anytime
  repeat:
    start: 2026-08-22
    rrule: FREQ=WEEKLY
    anchor: schedule
    missed: carry
---
# Future
`);

    expect(carry.effectiveOccurrenceState).toBe("overdue");
    expect(matchesTaskView(carry, "today", TODAY)).toBe(true);
    expect(matchesTaskView(carry, "review", TODAY)).toBe(true);
    expect(skip.effectiveOccurrenceState).toBe("future");
    expect(skip.effectiveOccurrenceDate).toBe("2026-08-21");
    expect(matchesTaskView(skip, "review", TODAY)).toBe(false);
    expect(matchesTaskView(skip, "upcoming", TODAY)).toBe(true);
    expect(future.effectiveOccurrenceDate).toBe("2026-08-22");
    expect(matchesTaskView(future, "upcoming", TODAY)).toBe(true);
  });
});
