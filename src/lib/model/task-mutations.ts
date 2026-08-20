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
} from "./task-document";

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

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year!, month! - 1, day! + days);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextRollingDate(
  current: string | undefined,
  completedAt: string,
  document: TaskDocument,
): string {
  const repeat = document.task.repeat;
  const interval = repeat?.interval ?? 1;
  const frequency = repeat?.frequency ?? "daily";
  const anchorDate =
    repeat?.anchor === "completion"
      ? completedAt.slice(0, 10)
      : current ?? completedAt.slice(0, 10);
  if (frequency === "weekly") return addDays(anchorDate, 7 * interval);
  if (frequency === "monthly") return addDays(anchorDate, 30 * interval);
  if (frequency === "yearly") return addDays(anchorDate, 365 * interval);
  return addDays(anchorDate, interval);
}

export function completeTaskDocument(
  document: ParsedTaskFile,
  at: string,
): ParsedTaskFile {
  const task = requireTask(document);
  if (!task.task.repeat) {
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
  const nextDate = nextRollingDate(task.task.plan?.date, at, task);
  const body = resetChecklistItems(
    task.body,
    task.task.repeat.resetChecklist === true,
  );
  return {
    ...task,
    updated: at,
    body,
    checklist: task.task.repeat.resetChecklist
      ? task.checklist.map((item) => ({ ...item, checked: false }))
      : task.checklist,
    task: {
      ...task.task,
      status: "open",
      completedAt: undefined,
      inbox: false,
      plan: task.task.plan ? { ...task.task.plan, date: nextDate } : undefined,
      repeat: {
        ...task.task.repeat,
        lastCompletedAt: at,
        completionCount: (task.task.repeat.completionCount ?? 0) + 1,
      },
    },
  };
}

export function skipOccurrence(
  document: ParsedTaskFile,
  at: string,
): ParsedTaskFile {
  const task = requireTask(document);
  if (!task.task.repeat || !task.task.plan) return task;
  const nextDate = nextRollingDate(task.task.plan.date, at, task);
  return {
    ...task,
    updated: at,
    task: {
      ...task.task,
      status: "open",
      plan: { ...task.task.plan, date: nextDate },
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
  const nextRepeat = repeat
    ? {
        ...repeat,
        ...(repeat.lastCompletedAt == null && currentRepeat?.lastCompletedAt
          ? { lastCompletedAt: currentRepeat.lastCompletedAt }
          : {}),
        ...(repeat.completionCount == null && currentRepeat?.completionCount != null
          ? { completionCount: currentRepeat.completionCount }
          : {}),
      }
    : undefined;
  return {
    ...task,
    updated: at,
    task: { ...task.task, repeat: nextRepeat },
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
