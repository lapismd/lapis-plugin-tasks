import type { AppDatabaseTaskOccurrenceRecord } from "@lapis-notes/api/app-database";
import { isPausedOccurrenceDate } from "./effective-occurrence";
import {
  analyzeRecurrenceRule,
  RecurrenceEngine,
  type LocalDateString,
} from "./recurrence-engine";
import type { TaskTracking } from "./task-document";
import type { TaskSummary } from "./task-queries";

export type TaskOccurrenceHistoricalOutcome =
  | "pending"
  | "completed"
  | "missed"
  | "unrecorded";

export type TaskOccurrenceHistoryFilter = "all" | "completed" | "missed";

export type TaskOccurrenceHistoryRow = {
  id: string;
  taskId: string;
  taskPath: string;
  title: string;
  occurrenceDate: LocalDateString;
  outcome: TaskOccurrenceHistoricalOutcome;
  expected: boolean;
  trackingKind: TaskTracking["type"];
  value?: number;
  unit?: string;
  durationMinutes?: number;
  observation?: AppDatabaseTaskOccurrenceRecord;
};

export type TaskOccurrenceStatistics = {
  currentStreak: number;
  longestStreak: number;
  completionRate: number | null;
  completed: number;
  expected: number;
  total?: number;
  average?: number;
  unit?: string;
  lastCompletedDate?: LocalDateString;
};

export function expectedTaskOccurrenceDates(
  task: Pick<TaskSummary, "repeat">,
  start: LocalDateString,
  end: LocalDateString,
): LocalDateString[] {
  const repeat = task.repeat;
  if (
    !repeat?.start ||
    analyzeRecurrenceRule(repeat.rrule).status !== "supported"
  ) {
    return [];
  }
  const engine = new RecurrenceEngine({
    start: repeat.start,
    rrule: repeat.rrule,
    rdate: repeat.rdate,
    exdate: repeat.exdate,
  });
  return engine
    .between(start, end)
    .filter((date) => !isPausedOccurrenceDate(repeat, date));
}

function isActiveOccurrence(task: TaskSummary, date: LocalDateString): boolean {
  return (
    task.effectiveOccurrenceDate === date &&
    (task.effectiveOccurrenceState === "current" ||
      task.effectiveOccurrenceState === "overdue")
  );
}

function historicalOutcome(
  task: TaskSummary,
  date: LocalDateString,
  today: LocalDateString,
  observation: AppDatabaseTaskOccurrenceRecord | undefined,
): TaskOccurrenceHistoricalOutcome {
  if (observation?.outcome === "completed") return "completed";
  if (isActiveOccurrence(task, date) || date > today) return "pending";
  return observation ? "missed" : "unrecorded";
}

function trackingKind(
  task: TaskSummary,
  observation?: AppDatabaseTaskOccurrenceRecord,
): TaskTracking["type"] {
  return observation?.trackingKind ?? task.tracking?.type ?? "boolean";
}

export function buildTaskOccurrenceHistory(
  tasks: TaskSummary[],
  observations: AppDatabaseTaskOccurrenceRecord[],
  start: LocalDateString,
  end: LocalDateString,
  today: LocalDateString,
): TaskOccurrenceHistoryRow[] {
  const observationsByTask = new Map<
    string,
    AppDatabaseTaskOccurrenceRecord[]
  >();
  for (const observation of observations) {
    const bucket = observationsByTask.get(observation.taskId) ?? [];
    bucket.push(observation);
    observationsByTask.set(observation.taskId, bucket);
  }

  const rows: TaskOccurrenceHistoryRow[] = [];
  const knownTaskIds = new Set<string>();
  for (const task of tasks) {
    if (!task.repeat) continue;
    knownTaskIds.add(task.id);
    const expectedDates = new Set(
      expectedTaskOccurrenceDates(task, start, end),
    );
    const observed = observationsByTask.get(task.id) ?? [];
    const observedByDate = new Map<string, AppDatabaseTaskOccurrenceRecord>();
    for (const observation of observed) {
      if (observedByDate.has(observation.occurrenceDate)) {
        throw new Error(
          `Duplicate occurrence observations for ${task.id} on ${observation.occurrenceDate}.`,
        );
      }
      observedByDate.set(observation.occurrenceDate, observation);
    }
    const dates = new Set<string>([
      ...expectedDates,
      ...observed
        .map((observation) => observation.occurrenceDate)
        .filter((date) => start <= date && date <= end),
    ]);
    for (const value of [...dates].sort()) {
      const date = value as LocalDateString;
      const observation = observedByDate.get(date);
      rows.push({
        id: `${task.id}:${date}`,
        taskId: task.id,
        taskPath: task.path,
        title: task.title,
        occurrenceDate: date,
        outcome: historicalOutcome(task, date, today, observation),
        expected: expectedDates.has(date),
        trackingKind: trackingKind(task, observation),
        ...(observation?.value != null ? { value: observation.value } : {}),
        ...(observation?.unit ? { unit: observation.unit } : {}),
        ...(observation?.durationMinutes != null
          ? { durationMinutes: observation.durationMinutes }
          : {}),
        ...(observation ? { observation } : {}),
      });
    }
  }

  // Retain an orphaned daily observation visibly even when its Task projection
  // is missing. It remains disposable and can be reconciled after index rebuild.
  for (const observation of observations) {
    if (
      knownTaskIds.has(observation.taskId) ||
      observation.occurrenceDate < start ||
      observation.occurrenceDate > end
    ) {
      continue;
    }
    rows.push({
      id: observation.observationId,
      taskId: observation.taskId,
      taskPath: observation.taskPath,
      title:
        observation.taskPath.split("/").at(-1)?.replace(/\.md$/i, "") ??
        observation.taskId,
      occurrenceDate: observation.occurrenceDate as LocalDateString,
      outcome: observation.outcome === "completed" ? "completed" : "missed",
      expected: false,
      trackingKind: observation.trackingKind,
      ...(observation.value != null ? { value: observation.value } : {}),
      ...(observation.unit ? { unit: observation.unit } : {}),
      ...(observation.durationMinutes != null
        ? { durationMinutes: observation.durationMinutes }
        : {}),
      observation,
    });
  }

  return rows.sort(
    (left, right) =>
      left.occurrenceDate.localeCompare(right.occurrenceDate) ||
      left.title.localeCompare(right.title),
  );
}

export function filterTaskOccurrenceHistory(
  rows: TaskOccurrenceHistoryRow[],
  filter: TaskOccurrenceHistoryFilter,
): TaskOccurrenceHistoryRow[] {
  if (filter === "all") return rows;
  if (filter === "completed") {
    return rows.filter((row) => row.outcome === "completed");
  }
  return rows.filter(
    (row) => row.outcome === "missed" || row.outcome === "unrecorded",
  );
}

export function deriveTaskOccurrenceStatistics(
  rows: TaskOccurrenceHistoryRow[],
  today: LocalDateString,
): TaskOccurrenceStatistics {
  const expected = rows
    .filter((row) => row.expected && row.occurrenceDate <= today)
    .sort((left, right) =>
      left.occurrenceDate.localeCompare(right.occurrenceDate),
    );
  const terminal = expected.filter((row) => row.outcome !== "pending");
  const completed = terminal.filter((row) => row.outcome === "completed");

  let longestStreak = 0;
  let streak = 0;
  for (const row of expected) {
    if (row.outcome === "pending") continue;
    if (row.outcome === "completed") {
      streak += 1;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }
  }

  let currentStreak = 0;
  for (const row of [...expected].reverse()) {
    if (row.outcome === "pending") continue;
    if (row.outcome !== "completed") break;
    currentStreak += 1;
  }

  const quantities = completed.flatMap((row) => {
    if (row.durationMinutes != null)
      return [
        { value: row.durationMinutes, unit: "minutes", kind: "duration" },
      ];
    if (row.value != null)
      return [{ value: row.value, unit: row.unit, kind: "value" }];
    return [];
  });
  const compatible =
    new Set(
      quantities.map((quantity) => `${quantity.kind}:${quantity.unit ?? ""}`),
    ).size === 1;
  const quantitative = compatible
    ? quantities.map((quantity) => quantity.value)
    : [];
  const total = quantitative.length
    ? quantitative.reduce((sum, value) => sum + value, 0)
    : undefined;
  const lastCompletedDate = completed.at(-1)?.occurrenceDate;
  const unit = compatible ? quantities[0]?.unit : undefined;

  return {
    currentStreak,
    longestStreak,
    completionRate: terminal.length ? completed.length / terminal.length : null,
    completed: completed.length,
    expected: terminal.length,
    ...(total !== undefined
      ? { total, average: total / quantitative.length }
      : {}),
    ...(unit ? { unit } : {}),
    ...(lastCompletedDate ? { lastCompletedDate } : {}),
  };
}
