import type { AppDatabaseTaskOccurrenceRecord } from "@lapis-notes/api/app-database";
import { describe, expect, it } from "vitest";
import {
  buildTaskOccurrenceHistory,
  deriveTaskOccurrenceStatistics,
  expectedTaskOccurrenceDates,
  filterTaskOccurrenceHistory,
} from "./task-history";
import type { TaskSummary } from "./task-queries";

function recurring(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "habit",
    path: "tasks/habit.md",
    title: "Habit",
    kind: "task",
    status: "open",
    inbox: false,
    startKind: "anytime",
    checklistTotal: 0,
    checklistCompleted: 0,
    commentCount: 0,
    repeat: {
      start: "2026-08-01",
      rrule: "FREQ=DAILY",
      anchor: "schedule",
      missed: "carry",
    },
    tracking: { type: "count", unit: "pages" },
    effectiveOccurrenceDate: "2026-08-05",
    effectiveOccurrenceState: "overdue",
    ...overrides,
  };
}

function observation(
  date: string,
  outcome: "pending" | "completed" | "missed",
  value?: number,
): AppDatabaseTaskOccurrenceRecord {
  return {
    observationId: `habit:${date}`,
    taskId: "habit",
    taskPath: "tasks/habit.md",
    dailyDocumentPath: `daily/${date}.md`,
    occurrenceDate: date,
    outcome,
    trackingKind: "count",
    ...(value !== undefined ? { value, unit: "pages" } : {}),
    sourceStart: 10,
    sourceEnd: 20,
    projectionVersion: 1,
  };
}

describe("task occurrence history", () => {
  it("derives RFC expectations while excluding EXDATE and inclusive pause ranges", () => {
    const task = recurring({
      repeat: {
        start: "2026-08-01",
        rrule: "FREQ=DAILY",
        anchor: "schedule",
        missed: "carry",
        exdate: ["2026-08-03"],
        pauseRanges: [{ start: "2026-08-05", end: "2026-08-06" }],
      },
    });
    expect(expectedTaskOccurrenceDates(task, "2026-08-01", "2026-08-07")).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-04",
      "2026-08-07",
    ]);
  });

  it("distinguishes completed, missed, unrecorded, and overdue carry pending", () => {
    const rows = buildTaskOccurrenceHistory(
      [recurring()],
      [
        observation("2026-08-01", "completed", 10),
        observation("2026-08-02", "pending"),
        observation("2026-08-05", "pending"),
      ],
      "2026-08-01",
      "2026-08-05",
      "2026-08-05",
    );
    expect(rows.map((row) => [row.occurrenceDate, row.outcome])).toEqual([
      ["2026-08-01", "completed"],
      ["2026-08-02", "missed"],
      ["2026-08-03", "unrecorded"],
      ["2026-08-04", "unrecorded"],
      ["2026-08-05", "pending"],
    ]);
    expect(filterTaskOccurrenceHistory(rows, "completed")).toHaveLength(1);
    expect(filterTaskOccurrenceHistory(rows, "missed")).toHaveLength(3);
  });

  it("derives streaks, completion rate, totals, averages, and latest completion", () => {
    const task = recurring({ effectiveOccurrenceDate: "2026-08-06", effectiveOccurrenceState: "current" });
    const rows = buildTaskOccurrenceHistory(
      [task],
      [
        observation("2026-08-01", "completed", 10),
        observation("2026-08-02", "completed", 20),
        observation("2026-08-03", "pending"),
        observation("2026-08-04", "completed", 30),
        observation("2026-08-05", "completed", 40),
        observation("2026-08-06", "pending"),
      ],
      "2026-08-01",
      "2026-08-06",
      "2026-08-06",
    );
    expect(deriveTaskOccurrenceStatistics(rows, "2026-08-06")).toEqual({
      currentStreak: 2,
      longestStreak: 2,
      completionRate: 0.8,
      completed: 4,
      expected: 5,
      total: 100,
      average: 25,
      unit: "pages",
      lastCompletedDate: "2026-08-05",
    });
  });

  it("retains completed observations on excepted dates but excludes them from statistics", () => {
    const task = recurring({
      repeat: {
        start: "2026-08-01",
        rrule: "FREQ=DAILY",
        anchor: "schedule",
        missed: "carry",
        exdate: ["2026-08-02"],
      },
    });
    const rows = buildTaskOccurrenceHistory(
      [task],
      [observation("2026-08-01", "completed", 10), observation("2026-08-02", "completed", 20)],
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    );
    expect(rows[1]).toMatchObject({ occurrenceDate: "2026-08-02", expected: false, outcome: "completed" });
    expect(deriveTaskOccurrenceStatistics(rows, "2026-08-03")).toMatchObject({
      completed: 1,
      expected: 1,
      total: 10,
    });
  });
});
