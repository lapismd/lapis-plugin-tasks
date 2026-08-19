import {
  formatTaskReference,
  resolveReferenceTarget,
  type ReferenceIndex,
  type ReferenceTarget,
} from "@lapismd/design-core/forms";
import type { ApplicationTask, JobApplication } from '../../model';

function taskProgressFor(tasks: ApplicationTask[]) {
  return {
    done: tasks.filter((task) => task.done).length,
    total: tasks.length,
  };
}

export function createApplicationTask(body: string): ApplicationTask {
  const timestamp = new Date().toISOString();
  const trimmed = body.trim();
  return {
    id: `task-${Date.now()}`,
    body: trimmed,
    done: false,
    status: "todo",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function appendApplicationTask(
  application: JobApplication,
  task: ApplicationTask,
): JobApplication {
  const nextTasks = [...(application.tasks ?? []), task];
  return {
    ...application,
    tasks: nextTasks,
    steps: taskProgressFor(nextTasks),
    updatedAt: new Date().toISOString(),
  };
}

export function taskReferenceForTask(
  applicationId: string,
  taskId: string,
): string {
  return formatTaskReference(applicationId, taskId);
}

export function draftApplicationTask(body: string): ApplicationTask {
  return {
    id: "__draft__",
    body: body.trim(),
    done: false,
    status: "todo",
  };
}

export function parseTaskReferenceRef(ref: string) {
  const match = ref.trim().match(/^\[\^tasks\/([^/]+)\/([^/]+)\]$/);
  if (!match) return null;
  return { applicationId: match[1], taskId: match[2] };
}

export function taskForReferenceRef(
  application: JobApplication,
  ref: string,
): ApplicationTask | null {
  const parsed = parseTaskReferenceRef(ref);
  if (!parsed || parsed.applicationId !== application.id) return null;
  return (application.tasks ?? []).find((task) => task.id === parsed.taskId) ?? null;
}

export function taskForReference(
  application: JobApplication,
  referenceIndex: ReferenceIndex,
  ref: string,
): ApplicationTask | null {
  const target = resolveReferenceTarget(referenceIndex, ref);
  if (!target) return null;
  return (application.tasks ?? []).find((task) => task.id === target.id) ?? null;
}

export function taskForReferenceTarget(
  application: JobApplication,
  reference: ReferenceTarget | null,
): ApplicationTask | null {
  if (!reference) return null;
  return (application.tasks ?? []).find((task) => task.id === reference.id) ?? null;
}
