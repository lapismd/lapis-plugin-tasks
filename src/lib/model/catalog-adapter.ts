import type { ParsedTaskFile } from "./task-document";
import type { TaskSummary } from "./task-queries";
import { createTask } from "./fixtures";
import type { Task, TaskWhen } from "./types";

function catalogWhen(input: {
  startKind?: string;
  planKind?: string | null;
  hasPlan?: boolean;
  deadline?: string;
}): TaskWhen | undefined {
  if (input.startKind === "someday") return "someday";
  if (input.planKind === "evening") return "this-evening";
  if (input.hasPlan || input.deadline) return undefined;
  return "anytime";
}

export function catalogTaskFromSummary(summary: TaskSummary): Task {
  return createTask({
    id: summary.id,
    title: summary.title,
    status: summary.status === "completed" ? "done" : summary.status === "canceled" ? "done" : "todo",
    inbox: summary.inbox,
    start: summary.startKind === "date" ? summary.startDate : summary.startKind,
    planDate: summary.planDate,
    planAt: summary.planKind === "time" ? summary.planTime : summary.planKind,
    planDuration:
      summary.durationMinutes != null ? `${summary.durationMinutes}m` : undefined,
    deadline: summary.deadline,
    dueAt: summary.deadline,
    scheduledAt: summary.planDate,
    when: catalogWhen({
      startKind: summary.startKind,
      planKind: summary.planKind,
      hasPlan: Boolean(summary.planDate),
      deadline: summary.deadline,
    }),
    completedAt: summary.completedAt,
    sourcePath: summary.path,
    notes: "",
  });
}

export function catalogTaskFromDocument(document: ParsedTaskFile): Task {
  if (document.kind !== "task") {
    return createTask({
      id: document.id,
      title: document.title,
      status: "todo",
      listId: document.kind === "task-list" ? document.id : undefined,
      sourcePath: document.path,
    });
  }
  return createTask({
    id: document.id,
    title: document.title,
    status: document.task.status === "open" ? "todo" : "done",
    inbox: document.task.inbox,
    start:
      document.task.start.kind === "date"
        ? document.task.start.date
        : document.task.start.kind,
    planDate: document.task.plan?.date,
    planAt:
      document.task.plan?.at === "time"
        ? document.task.plan.time
        : document.task.plan?.at,
    planDuration: document.task.plan?.duration,
    deadline: document.task.deadline,
    dueAt: document.task.deadline,
    scheduledAt: document.task.plan?.date,
    when: catalogWhen({
      startKind: document.task.start.kind,
      planKind: document.task.plan?.at,
      hasPlan: Boolean(document.task.plan),
      deadline: document.task.deadline,
    }),
    completedAt: document.task.completedAt,
    sourcePath: document.path,
    notes: document.body,
  });
}
