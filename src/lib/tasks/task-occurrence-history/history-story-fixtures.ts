import type { TaskOccurrenceHistoryRow } from "../../model";

export const trackedHistoryStoryRows: TaskOccurrenceHistoryRow[] = [
  { id: "water:2026-08-20", taskId: "water", taskPath: "tasks/water.md", title: "Drink water", occurrenceDate: "2026-08-20", outcome: "completed", expected: true, trackingKind: "count", value: 8, unit: "glasses" },
  { id: "read:2026-08-20", taskId: "read", taskPath: "tasks/read.md", title: "Read", occurrenceDate: "2026-08-20", outcome: "missed", expected: true, trackingKind: "duration" },
  { id: "walk:2026-08-20", taskId: "walk", taskPath: "tasks/walk.md", title: "Walk", occurrenceDate: "2026-08-20", outcome: "unrecorded", expected: true, trackingKind: "boolean" },
];

export const selectedDateHistoryStoryRows: TaskOccurrenceHistoryRow[] = [
  { id: "habit:2026-08-20", taskId: "habit", taskPath: "tasks/habit.md", title: "Morning pages", occurrenceDate: "2026-08-20", outcome: "completed", expected: true, trackingKind: "count", value: 3, unit: "pages" },
  { id: "walk:2026-08-20", taskId: "walk", taskPath: "tasks/walk.md", title: "Evening walk", occurrenceDate: "2026-08-20", outcome: "unrecorded", expected: true, trackingKind: "duration" },
];
