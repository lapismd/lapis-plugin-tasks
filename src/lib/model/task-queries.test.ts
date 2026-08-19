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
  return taskDocumentToSummary(document);
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
    expect(matchesTaskView(inbox, "inbox", TODAY)).toBe(true);
    expect(matchesTaskView(today, "today", TODAY)).toBe(true);
    expect(matchesTaskView(today, "review", TODAY)).toBe(true);
    expect(matchesTaskView(anytime, "anytime", TODAY)).toBe(true);
    expect(matchesTaskView(someday, "someday", TODAY)).toBe(true);
    expect(matchesTaskView(today, "anytime", TODAY)).toBe(false);
  });
});
