import { createTask } from "./fixtures";
import type { ApplicationTaskAdapter, CreateTaskInput, Task } from "./types";

export function taskToApplicationTask(task: Task): ApplicationTaskAdapter {
  return {
    id: task.id,
    body: task.title,
    done:
      task.status === "done" ||
      task.status === "completed" ||
      task.status === "canceled" ||
      Boolean(task.completedAt),
    dueAt: task.dueAt,
    scheduledAt: task.scheduledAt,
    when: task.when,
    status: task.status,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    priority: task.priority,
    linkedTo: task.linkedTo,
    areas: task.areas,
    listId: task.listId,
    start: task.start,
    planDate: task.planDate,
    planAt: task.planAt,
    repeat: task.repeat,
    tracking: task.tracking,
    effectiveOccurrenceDate: task.effectiveOccurrenceDate,
    effectiveOccurrenceState: task.effectiveOccurrenceState,
    effectiveForDate: task.effectiveForDate,
    deadline: task.deadline ?? task.dueAt,
    inbox: task.inbox,
    checklistTotal: task.checklistTotal,
    checklistCompleted: task.checklistCompleted,
    notes: task.notes.trim() || undefined,
    order: task.order,
  };
}

export function applicationTaskToTask(
  applicationId: string,
  task: ApplicationTaskAdapter,
  existing?: Task,
): Task {
  const createdAt = task.createdAt ?? existing?.createdAt;
  const updatedAt = task.updatedAt ?? new Date().toISOString();
  const input: CreateTaskInput = {
    id: task.id,
    title: task.body,
    status: task.status ?? (task.done ? "completed" : "open"),
    priority: task.priority,
    applicationId,
    linkedTo: task.linkedTo,
    dueAt: task.dueAt ?? task.deadline,
    deadline: task.deadline ?? task.dueAt,
    completedAt: task.completedAt,
    createdAt,
    updatedAt,
    scheduledAt: Object.prototype.hasOwnProperty.call(task, "scheduledAt")
      ? task.scheduledAt
      : existing?.scheduledAt,
    when: Object.prototype.hasOwnProperty.call(task, "when")
      ? task.when
      : existing?.when,
    areas: Object.prototype.hasOwnProperty.call(task, "areas")
      ? task.areas
      : existing?.areas,
    listId: Object.prototype.hasOwnProperty.call(task, "listId")
      ? task.listId
      : existing?.listId,
    start: Object.prototype.hasOwnProperty.call(task, "start")
      ? task.start
      : existing?.start,
    planDate: Object.prototype.hasOwnProperty.call(task, "planDate")
      ? task.planDate
      : existing?.planDate,
    planAt: Object.prototype.hasOwnProperty.call(task, "planAt")
      ? task.planAt
      : existing?.planAt,
    repeat: Object.prototype.hasOwnProperty.call(task, "repeat")
      ? task.repeat
      : existing?.repeat,
    tracking: Object.prototype.hasOwnProperty.call(task, "tracking")
      ? task.tracking
      : existing?.tracking,
    effectiveOccurrenceDate: task.effectiveOccurrenceDate,
    effectiveOccurrenceState: task.effectiveOccurrenceState,
    effectiveForDate: task.effectiveForDate,
    inbox: Object.prototype.hasOwnProperty.call(task, "inbox")
      ? task.inbox
      : existing?.inbox,
    checklistTotal: task.checklistTotal ?? existing?.checklistTotal,
    checklistCompleted: task.checklistCompleted ?? existing?.checklistCompleted,
    tags: existing?.tags,
    order: task.order ?? existing?.order,
    todayOrder: existing?.todayOrder,
    areaOrder: existing?.areaOrder,
    notes: task.notes ?? existing?.notes ?? "",
  };
  return createTask(input);
}

export function hydrateApplicationTasks<
  TApplication extends { id: string; tasks?: ApplicationTaskAdapter[] },
>(application: TApplication, tasks: Task[]): TApplication {
  const applicationTasks = tasks
    .filter((task) => task.applicationId === application.id)
    .map(taskToApplicationTask);
  return {
    ...application,
    tasks: applicationTasks.length ? applicationTasks : undefined,
  };
}
