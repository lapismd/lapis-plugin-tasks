import type { ParsedTaskFile } from "./task-document";
import type { TaskSummary } from "./task-queries";
import { createTask } from "./fixtures";
import type { Task } from "./types";

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
    when:
      summary.startKind === "someday"
        ? "someday"
        : summary.planKind === "evening"
          ? "this-evening"
          : summary.planDate
            ? undefined
            : "anytime",
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
      listId: document.id,
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
    when:
      document.task.start.kind === "someday"
        ? "someday"
        : document.task.plan?.at === "evening"
          ? "this-evening"
          : document.task.plan
            ? undefined
            : "anytime",
    completedAt: document.task.completedAt,
    sourcePath: document.path,
    notes: document.body,
  });
}
