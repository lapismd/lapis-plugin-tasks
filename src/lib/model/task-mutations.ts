import {
  parseTaskDocument,
  resetChecklistItems,
  serializeTaskDocument,
  type ChecklistItem,
  type ParsedTaskFile,
  type TaskDocument,
  type TaskPlan,
  type TaskRepeat,
  type TaskStart,
  type TaskTracking,
} from "./task-document";
import {
  analyzeRecurrenceRule,
  isLocalDateString,
  type LocalDateString,
} from "./recurrence-engine";
import {
  nextRecurrenceDate,
  resolveEffectiveOccurrence,
} from "./effective-occurrence";

function requireTask(document: ParsedTaskFile): TaskDocument {
  if (document.kind !== "task") {
    throw new Error("Expected a task document.");
  }
  return document;
}

export class TaskChecklistMutationError extends Error {
  readonly code = "stale-checklist-item";

  constructor(message = "The checklist changed before this item could be updated.") {
    super(message);
    this.name = "TaskChecklistMutationError";
  }
}

function replaceChecklistMarker(
  task: TaskDocument,
  item: ChecklistItem,
  checked: boolean,
): string {
  const bodyFrom = task.raw.length - task.body.length;
  const from = item.sourceStart - bodyFrom;
  const to = item.sourceEnd - bodyFrom;
  if (from < 0 || task.body.slice(from, to) !== item.source) {
    throw new TaskChecklistMutationError();
  }
  const replacement = item.source.replace(
    /^(\s*[-*+]\s+\[)( |x|X)(\])/,
    `$1${checked ? "x" : " "}$3`,
  );
  if (replacement === item.source && item.checked !== checked) {
    throw new TaskChecklistMutationError();
  }
  return `${task.body.slice(0, from)}${replacement}${task.body.slice(to)}`;
}

export function setTaskChecklistItemChecked(
  document: ParsedTaskFile,
  position: number,
  expectedText: string,
  checked: boolean,
): TaskDocument {
  const task = requireTask(document);
  const item = task.checklist[position];
  if (!item || item.position !== position || item.text !== expectedText.trim()) {
    throw new TaskChecklistMutationError();
  }
  const body = replaceChecklistMarker(task, item, checked);
  const checklist: ChecklistItem[] = task.checklist.map((entry) =>
    entry.position === position ? { ...entry, checked } : entry,
  );
  return { ...task, body, checklist };
}

export class TaskRecurrenceMutationError extends Error {
  readonly code = "recurrence-advancement-blocked";

  constructor(message: string) {
    super(message);
    this.name = "TaskRecurrenceMutationError";
  }
}

function requireLocalDate(value: string): LocalDateString {
  if (!isLocalDateString(value)) {
    throw new Error(`Expected a local YYYY-MM-DD date; received ${value}.`);
  }
  return value;
}

function actionDate(at: string, localDate?: string): LocalDateString {
  return requireLocalDate(localDate ?? at.slice(0, 10));
}

function addCalendarDays(
  value: LocalDateString,
  amount: number,
): LocalDateString {
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + amount));
  return `${String(next.getUTCFullYear()).padStart(4, "0")}-${String(
    next.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(next.getUTCDate()).padStart(
    2,
    "0",
  )}` as LocalDateString;
}

function requireExecutableRepeat(task: TaskDocument): TaskRepeat {
  if (!task.task.repeat) {
    if (task.task.unparsedRepeat !== undefined) {
      throw new TaskRecurrenceMutationError(
        "This recurrence is invalid or legacy. Replace or remove it before completion or skip.",
      );
    }
    throw new TaskRecurrenceMutationError("This task does not recur.");
  }
  const analysis = analyzeRecurrenceRule(task.task.repeat.rrule);
  if (analysis.status !== "supported") {
    throw new TaskRecurrenceMutationError(
      analysis.status === "unsupported"
        ? `Replace unsupported recurrence properties before advancement: ${analysis.parts.join(", ")}.`
        : analysis.message,
    );
  }
  if (task.task.repeat.paused) {
    throw new TaskRecurrenceMutationError(
      "Resume this recurrence before completion or skip.",
    );
  }
  return task.task.repeat;
}

export function completeTaskDocument(
  document: ParsedTaskFile,
  at: string,
  localDate?: string,
): ParsedTaskFile {
  const task = requireTask(document);
  if (!task.task.repeat && task.task.unparsedRepeat === undefined) {
    return {
      ...task,
      updated: at,
      task: {
        ...task.task,
        status: "completed",
        completedAt: at,
        inbox: false,
      },
    };
  }
  const repeat = requireExecutableRepeat(task);
  const completedOn = actionDate(at, localDate);
  const establishedRepeat: TaskRepeat =
    repeat.anchor === "completion" && !repeat.start
      ? { ...repeat, start: completedOn, missed: "carry" }
      : repeat;
  const occurrence = resolveEffectiveOccurrence(
    establishedRepeat,
    task.task.plan?.date as LocalDateString | undefined,
    completedOn,
  );
  if (
    occurrence.state === "future" ||
    occurrence.state === "exhausted" ||
    occurrence.state === "paused" ||
    occurrence.state === "unsupported"
  ) {
    throw new TaskRecurrenceMutationError(
      `Cannot complete a recurrence in ${occurrence.state} state.`,
    );
  }
  const anchorDate =
    establishedRepeat.anchor === "completion"
      ? completedOn
      : occurrence.date ?? completedOn;
  const nextDate = nextRecurrenceDate(establishedRepeat, anchorDate, false);
  const body = resetChecklistItems(
    task.body,
    establishedRepeat.resetChecklist === true,
  );
  return {
    ...task,
    updated: at,
    body,
    checklist: establishedRepeat.resetChecklist
      ? task.checklist.map((item) => ({ ...item, checked: false }))
      : task.checklist,
    task: {
      ...task.task,
      status: "open",
      completedAt: undefined,
      inbox: false,
      plan:
        task.task.plan && nextDate
          ? { ...task.task.plan, date: nextDate }
          : undefined,
      repeat: {
        ...establishedRepeat,
        lastCompletedAt: at,
        completionCount: (establishedRepeat.completionCount ?? 0) + 1,
      },
    },
  };
}

export function skipOccurrence(
  document: ParsedTaskFile,
  at: string,
  localDate?: string,
): ParsedTaskFile {
  const task = requireTask(document);
  if (!task.task.repeat && task.task.unparsedRepeat === undefined) return task;
  const repeat = requireExecutableRepeat(task);
  const skippedOn = actionDate(at, localDate);
  const occurrence = resolveEffectiveOccurrence(
    repeat,
    task.task.plan?.date as LocalDateString | undefined,
    skippedOn,
  );
  if (!occurrence.date || occurrence.state === "exhausted") return task;
  const nextDate = nextRecurrenceDate(repeat, occurrence.date, false);
  return {
    ...task,
    updated: at,
    task: {
      ...task.task,
      status: "open",
      plan:
        task.task.plan && nextDate
          ? { ...task.task.plan, date: nextDate }
          : undefined,
    },
  };
}

export function planTaskDocument(
  document: ParsedTaskFile,
  plan: TaskPlan | undefined,
  at: string,
): ParsedTaskFile {
  const task = requireTask(document);
  const start: TaskStart =
    task.task.start.kind === "someday" && plan
      ? { kind: "anytime" }
      : task.task.start;
  return {
    ...task,
    updated: at,
    task: {
      ...task.task,
      start,
      plan,
    },
  };
}

export function setTaskStart(
  document: ParsedTaskFile,
  start: TaskStart,
  at: string,
): ParsedTaskFile {
  const task = requireTask(document);
  return {
    ...task,
    updated: at,
    task: {
      ...task.task,
      start,
      plan: start.kind === "someday" ? undefined : task.task.plan,
    },
  };
}

export function setTaskDeadline(
  document: ParsedTaskFile,
  deadline: string | undefined,
  at: string,
): ParsedTaskFile {
  const task = requireTask(document);
  return {
    ...task,
    updated: at,
    task: { ...task.task, deadline },
  };
}

export function setTaskInbox(
  document: ParsedTaskFile,
  inbox: boolean,
  at: string,
): ParsedTaskFile {
  const task = requireTask(document);
  return {
    ...task,
    updated: at,
    task: { ...task.task, inbox },
  };
}

export function setTaskRepeat(
  document: ParsedTaskFile,
  repeat: TaskRepeat | undefined,
  at: string,
): TaskDocument {
  const task = requireTask(document);
  const currentRepeat = task.task.repeat;
  if (repeat) {
    const analysis = analyzeRecurrenceRule(repeat.rrule);
    if (analysis.status === "invalid") throw new Error(analysis.message);
    if (repeat.anchor === "schedule" && !repeat.start) {
      throw new Error("Schedule-anchored recurrence requires start.");
    }
  }
  const normalizedRepeat = repeat
    ? repeat.anchor === "completion"
      ? { ...repeat, missed: "carry" as const }
      : repeat
    : undefined;
  const nextRepeat = normalizedRepeat
    ? {
        ...normalizedRepeat,
        ...(normalizedRepeat.lastCompletedAt == null &&
        currentRepeat?.lastCompletedAt
          ? { lastCompletedAt: currentRepeat.lastCompletedAt }
          : {}),
        ...(normalizedRepeat.completionCount == null &&
        currentRepeat?.completionCount != null
          ? { completionCount: currentRepeat.completionCount }
          : {}),
      }
    : undefined;
  return {
    ...task,
    updated: at,
    task: {
      ...task.task,
      repeat: nextRepeat,
      unparsedRepeat: undefined,
      ...(!nextRepeat
        ? { tracking: undefined, unparsedTracking: undefined }
        : {}),
    },
  };
}

export function setTaskTracking(
  document: ParsedTaskFile,
  tracking: TaskTracking | undefined,
  at: string,
): TaskDocument {
  const task = requireTask(document);
  if (tracking && !task.task.repeat) {
    throw new Error("Tracking requires recurrence.");
  }
  return {
    ...task,
    updated: at,
    task: {
      ...task.task,
      tracking,
      unparsedTracking: undefined,
    },
  };
}

export function pauseTaskRecurrence(
  document: ParsedTaskFile,
  at: string,
  localDate?: string,
): TaskDocument {
  const task = requireTask(document);
  if (task.task.repeat?.paused) return task;
  const repeat = requireExecutableRepeat(task);
  return {
    ...task,
    updated: at,
    task: {
      ...task.task,
      repeat: {
        ...repeat,
        paused: true,
        pausedSince: actionDate(at, localDate),
      },
    },
  };
}

export function resumeTaskRecurrence(
  document: ParsedTaskFile,
  at: string,
  localDate?: string,
): TaskDocument {
  const task = requireTask(document);
  const repeat = task.task.repeat;
  if (!repeat?.paused || !repeat.pausedSince) return task;
  const resumedOn = actionDate(at, localDate);
  const rangeEnd = addCalendarDays(resumedOn, -1);
  const pauseRanges = [
    ...(repeat.pauseRanges ?? []),
    ...(repeat.pausedSince <= rangeEnd
      ? [{ start: repeat.pausedSince, end: rangeEnd }]
      : []),
  ];
  const resumedRepeat: TaskRepeat = {
    ...repeat,
    paused: false,
    pausedSince: undefined,
    pauseRanges,
  };
  const nextDate = repeat.start
    ? nextRecurrenceDate(resumedRepeat, resumedOn, true)
    : resumedOn;
  return {
    ...task,
    updated: at,
    task: {
      ...task.task,
      plan:
        task.task.plan && nextDate
          ? { ...task.task.plan, date: nextDate }
          : undefined,
      repeat: resumedRepeat,
    },
  };
}

export function cancelTaskDocument(
  document: ParsedTaskFile,
  at: string,
): ParsedTaskFile {
  const task = requireTask(document);
  return {
    ...task,
    updated: at,
    task: { ...task.task, status: "canceled", inbox: false },
  };
}

export function reopenTaskDocument(
  document: ParsedTaskFile,
  at: string,
): ParsedTaskFile {
  const task = requireTask(document);
  return {
    ...task,
    updated: at,
    task: {
      ...task.task,
      status: "open",
      completedAt: undefined,
    },
  };
}

export function applyTaskMutation(
  raw: string,
  path: string,
  mutate: (document: ParsedTaskFile) => ParsedTaskFile,
): string {
  const parsed = parseTaskDocument(raw, path);
  if (!parsed) throw new Error(`Not a task document: ${path}`);
  return serializeTaskDocument(mutate(parsed));
}
