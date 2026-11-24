import { describe, expect, it, vi } from "vitest";
import { stringify } from "yaml";
import type { BackgroundJobContext } from "@lapis-notes/api/background-jobs";
import { parseTaskDocument } from "../model/task-document";
import { matchesTaskView, taskDocumentToSummary } from "../model/task-queries";
import { run } from "./overdue-digest";
const date = "2026-11-24";
function row(id: string, task: Record<string, unknown>) {
  return {
    file: { path: `${id}.md` },
    properties: [
      { name: "type", value: "task" },
      { name: "id", value: id },
      { name: "task", value: task },
    ],
  };
}
function fixture(pages: unknown[], state: unknown = null) {
  const query = vi.fn();
  for (const page of pages) query.mockReturnValueOnce(page);
  const notify = vi.fn(),
    save = vi.fn();
  const context = {
    localDate: date,
    signal: { aborted: false },
    state: { load: () => state, save },
    metadata: { query },
    notifications: { notify },
  } as unknown as BackgroundJobContext;
  return { context, query, notify, save };
}
describe("overdue digest", () => {
  it("matches retained Review rules including recurrence across all pages", () => {
    const tasks = [
      { status: "open", plan: { date: "2026-11-23", at: "anytime" } },
      { status: "completed", plan: { date: "2026-11-23", at: "anytime" } },
      { status: "open", deadline: "2026-11-23" },
      { status: "open", plan: { date: "2026-11-24", at: "anytime" } },
      {
        status: "open",
        plan: { date: "2026-11-20", at: "anytime" },
        repeat: {
          start: "2026-11-20",
          rrule: "FREQ=DAILY;INTERVAL=3",
          anchor: "schedule",
          missed: "skip",
        },
      },
    ];
    const rows = tasks.map((task, index) => row(`task-${index}`, task));
    const summaries = tasks.map((task, index) => {
      const document = parseTaskDocument(
        `---\n${stringify({ type: "task", id: `task-${index}`, task })}---\n`,
        `task-${index}.md`,
      )!;
      if (index === 4) {
        expect(document.task?.repeat?.start).toBe("2026-11-20");
        expect(document.task?.unparsedRepeat).toBeUndefined();
      }
      return taskDocumentToSummary(document, date);
    });
    expect(summaries[4]!.effectiveOccurrenceState).toBe("future");
    expect(summaries[4]!.effectiveOccurrenceDate).toBe("2026-11-26");
    expect(matchesTaskView(summaries[4]!, "review", date)).toBe(false);
    const expected = summaries.filter((task) =>
      matchesTaskView(task, "review", date),
    ).length;
    expect(expected).toBe(1);
    const f = fixture([
      { rows: rows.slice(0, 2), nextCursor: "next" },
      { rows: rows.slice(2) },
    ]);
    run(f.context);
    expect(f.query).toHaveBeenCalledTimes(2);
    expect(f.query.mock.calls[1][0].after).toBe("next");
    expect(f.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        id: `overdue-${date}`,
        message: expect.stringContaining(`${expected} overdue`),
      }),
    );
    expect(f.save).toHaveBeenCalledWith({ notifiedOn: date, count: expected });
  });
  it("stays quiet for empty results and already notified dates", () => {
    const empty = fixture([{ rows: [] }]);
    run(empty.context);
    expect(empty.notify).not.toHaveBeenCalled();
    expect(empty.save).not.toHaveBeenCalled();
    const previous = fixture([], { notifiedOn: date, count: 3 });
    run(previous.context);
    expect(previous.query).not.toHaveBeenCalled();
  });
  it("does not checkpoint or notify partial or cancelled scans", () => {
    const f = fixture([
      {
        rows: [
          row("old", {
            status: "open",
            plan: { date: "2026-11-20", at: "anytime" },
          }),
        ],
        nextCursor: "next",
      },
    ]);
    f.query
      .mockReset()
      .mockImplementationOnce(() => ({
        rows: [
          row("old", {
            status: "open",
            plan: { date: "2026-11-20", at: "anytime" },
          }),
        ],
        nextCursor: "next",
      }))
      .mockImplementationOnce(() => {
        throw Error("Database unavailable");
      });
    expect(() => run(f.context)).toThrow("Database unavailable");
    expect(f.notify).not.toHaveBeenCalled();
    expect(f.save).not.toHaveBeenCalled();
    const cancelled = fixture([]);
    Object.assign(cancelled.context.signal, { aborted: true });
    expect(() => run(cancelled.context)).toThrow("cancelled");
    expect(cancelled.query).not.toHaveBeenCalled();
  });
  it("refuses repeated cursors and preserves delivery failure", () => {
    const f = fixture([
      { rows: [], nextCursor: "same" },
      { rows: [], nextCursor: "same" },
    ]);
    expect(() => run(f.context)).toThrow("cursor repeated");
    expect(f.save).not.toHaveBeenCalled();
    const delivery = fixture([
      {
        rows: [
          row("old", {
            status: "open",
            plan: { date: "2026-11-20", at: "anytime" },
          }),
        ],
      },
    ]);
    delivery.notify.mockImplementation(() => {
      throw Error("Delivery failed");
    });
    expect(() => run(delivery.context)).toThrow("Delivery failed");
    expect(delivery.save).not.toHaveBeenCalled();
  });
});
