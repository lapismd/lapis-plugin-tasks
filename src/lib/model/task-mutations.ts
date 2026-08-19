import {
  parseTaskDocument,
  replaceChecklistSection,
  replaceReservedLinks,
  serializeTaskDocument,
  type ParsedTaskFile,
  type TaskDocument,
  type TaskPlan,
  type TaskStart,
} from "./task-document";

function requireTask(document: ParsedTaskFile): TaskDocument {
  if (document.kind !== "task") {
    throw new Error("Expected a task document.");
  }
  return document;
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
  const body = replaceChecklistSection(
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

export function setReservedLinks(
  document: ParsedTaskFile,
  heading: "Subtasks" | "Items",
  links: Array<{ title: string; href: string }>,
): ParsedTaskFile {
  const body = replaceReservedLinks(document.body, heading, links);
  const next = parseTaskDocument(serializeTaskDocument({ ...document, body }), document.path);
  return next ?? document;
}
