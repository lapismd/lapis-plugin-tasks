import { createTask } from "./fixtures";
import type { ApplicationTaskAdapter, CreateTaskInput, Task } from "./types";

export function taskToApplicationTask(task: Task): ApplicationTaskAdapter {
  return {
    id: task.id,
    body: task.title,
    done: task.status === "done" || Boolean(task.completedAt),
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
    status: task.done ? "done" : (task.status ?? "todo"),
    priority: task.priority,
    applicationId,
    linkedTo: task.linkedTo,
    dueAt: task.dueAt,
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

