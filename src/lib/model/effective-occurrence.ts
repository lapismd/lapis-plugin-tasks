import {
  analyzeRecurrenceRule,
  RecurrenceEngine,
  type LocalDateString,
} from "./recurrence-engine";
import type { TaskRepeat } from "./task-document";

export type EffectiveOccurrenceState =
  | "current"
  | "overdue"
  | "future"
  | "exhausted"
  | "paused"
  | "unsupported";

export type EffectiveOccurrence = {
  date?: LocalDateString;
  state: EffectiveOccurrenceState;
  effectiveForDate: LocalDateString;
  warning?: string;
};

function createEngine(repeat: TaskRepeat): RecurrenceEngine {
  const start = repeat.start;
  if (!start) {
    throw new Error("Completion-anchored recurrence has not established a start.");
  }
  return new RecurrenceEngine({
    start,
    rrule: repeat.rrule,
    rdate: repeat.rdate,
    exdate: repeat.exdate,
  });
}

export function isPausedOccurrenceDate(
  repeat: TaskRepeat,
  date: LocalDateString,
): boolean {
  return Boolean(
    repeat.pauseRanges?.some(
      (range) => range.start <= date && date <= range.end,
    ),
  );
}

export function nextRecurrenceDate(
  repeat: TaskRepeat,
  after: LocalDateString,
  inclusive = false,
): LocalDateString | null {
  const engine = createEngine(repeat);
  let candidate = engine.next(after, inclusive);
  while (candidate && isPausedOccurrenceDate(repeat, candidate)) {
    candidate = engine.next(candidate, false);
  }
  return candidate;
}

function occurrenceAtLifecycleIndex(
  repeat: TaskRepeat,
): LocalDateString | null {
  if (!repeat.start) return null;
  let candidate: LocalDateString | null = nextRecurrenceDate(
    repeat,
    repeat.start,
    true,
  );
  let remaining = repeat.completionCount ?? 0;
  while (candidate && remaining > 0) {
    candidate = nextRecurrenceDate(repeat, candidate, false);
    remaining -= 1;
  }
  return candidate;
}

/** Resolve anchor and missed policy without mutating authoritative Markdown. */
export function resolveEffectiveOccurrence(
  repeat: TaskRepeat,
  planDate: LocalDateString | undefined,
  today: LocalDateString,
): EffectiveOccurrence {
  const analysis = analyzeRecurrenceRule(repeat.rrule);
  if (analysis.status === "invalid") {
    return {
      date: planDate ?? repeat.start,
      state: "unsupported",
      effectiveForDate: today,
      warning: analysis.message,
    };
  }
  if (analysis.status === "unsupported") {
    return {
      date: planDate ?? repeat.start,
      state: "unsupported",
      effectiveForDate: today,
      warning: `Unsupported recurrence properties: ${analysis.parts.join(", ")}`,
    };
  }
  if (repeat.paused) {
    return {
      date: planDate ?? repeat.start,
      state: "paused",
      effectiveForDate: today,
    };
  }
  if (!repeat.start) {
    return {
      date: planDate,
      state: planDate
        ? planDate < today
          ? "overdue"
          : planDate === today
            ? "current"
            : "future"
        : "current",
      effectiveForDate: today,
    };
  }

  let candidate = planDate
    ? nextRecurrenceDate(repeat, planDate, true)
    : occurrenceAtLifecycleIndex(repeat);
  if (repeat.missed === "skip") {
    const floor = candidate && candidate > today ? candidate : today;
    candidate = nextRecurrenceDate(repeat, floor, true);
  }
  if (!candidate) {
    return { state: "exhausted", effectiveForDate: today };
  }
  return {
    date: candidate,
    state:
      candidate < today
        ? "overdue"
        : candidate === today
          ? "current"
          : "future",
    effectiveForDate: today,
  };
}
