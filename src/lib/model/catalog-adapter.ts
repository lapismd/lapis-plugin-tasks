import type { ParsedTaskFile } from "./task-document";
import type { TaskSummary } from "./task-queries";
import { createTask } from "./fixtures";
import type { Task, TaskStatus, TaskWhen } from "./types";

function catalogStatus(status: string | undefined): TaskStatus {
  if (status === "completed" || status === "done") return "completed";
  if (status === "canceled") return "canceled";
  return "open";
}

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
    status: catalogStatus(summary.status),
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
    checklistTotal: summary.checklistTotal,
    checklistCompleted: summary.checklistCompleted,
    notes: "",
    repeat: summary.repeat,
  });
}

export function catalogTaskFromDocument(document: ParsedTaskFile): Task {
  if (document.kind !== "task") {
    return createTask({
      id: document.id,
      title: document.title,
      status: "open",
      listId: document.kind === "task-list" ? document.id : undefined,
      sourcePath: document.path,
    });
  }
  return createTask({
    id: document.id,
    title: document.title,
    status: catalogStatus(document.task.status),
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
    checklistTotal: document.checklist.length,
    checklistCompleted: document.checklist.filter((item) => item.checked).length,
    notes: document.body,
    repeat: document.task.repeat,
  });
}
