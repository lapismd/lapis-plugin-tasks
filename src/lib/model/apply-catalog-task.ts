import { listsMatch } from "./list-navigation";
import { taskDateOnly } from "./planner";
import type { Task, TaskQuickCreateInput } from "./types";
import type {
  TaskPlan,
  TaskRepeat,
  TaskStart,
  TaskTracking,
} from "./task-document";
import { catalogTaskFromSummary } from "./catalog-adapter";
import type { TaskRepository } from "./task-repository";

function isCanceled(task: Task): boolean {
  return task.status === "canceled";
}

function isCompleted(task: Task): boolean {
  return (
    !isCanceled(task) &&
    (task.status === "done" ||
      task.status === "completed" ||
      Boolean(task.completedAt))
  );
}

function isOpen(task: Task): boolean {
  return (
    task.status === "open" ||
    task.status === "todo" ||
    task.status === "waiting" ||
    (!isCompleted(task) && !isCanceled(task))
  );
}

function catalogStart(task: Task): TaskStart {
  if (task.start === "someday" || task.when === "someday") {
    return { kind: "someday" };
  }
  if (task.start && task.start !== "anytime" && task.start !== "someday") {
    return { kind: "date", date: task.start };
  }
  return { kind: "anytime" };
}

function catalogPlan(task: Task): TaskPlan | undefined {
  if (task.when === "anytime" || task.when === "someday") return undefined;
  const date =
    taskDateOnly(task.planDate) ??
    taskDateOnly(task.scheduledAt) ??
    (task.when === "today" || task.when === "this-evening"
      ? taskDateOnly(task.updatedAt)
      : null);
  if (!date) return undefined;
  if (task.planAt === "morning" || task.planAt === "afternoon") {
    return { date, at: task.planAt };
  }
  if (task.planAt === "evening" || task.when === "this-evening") {
    return { date, at: "evening" };
  }
  if (typeof task.planAt === "string" && /^\d{2}:\d{2}$/.test(task.planAt)) {
    return { date, at: "time", time: task.planAt };
  }
  return { date, at: "anytime" };
}

function startsEqual(left: TaskStart, right: TaskStart): boolean {
  if (left.kind !== right.kind) return false;
  return (
    left.kind !== "date" || left.date === (right as { date?: string }).date
  );
}

function plansEqual(
  left: TaskPlan | undefined,
  right: TaskPlan | undefined,
): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return (
    left.date === right.date && left.at === right.at && left.time === right.time
  );
}

function repeatsEqual(
  left: TaskRepeat | undefined,
  right: TaskRepeat | undefined,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function trackingEqual(
  left: TaskTracking | undefined,
  right: TaskTracking | undefined,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function uniquePath(
  existingPaths: Iterable<string>,
  directory: string,
  title: string,
  fallback: string,
): string {
  const slug =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback;
  const existing = new Set(existingPaths);
  let path = `${directory}/${slug}.md`;
  let index = 2;
  while (existing.has(path)) {
    path = `${directory}/${slug}-${index}.md`;
    index += 1;
  }
  return path;
}

function uniqueInboxPath(
  existingPaths: Iterable<string>,
  title: string,
): string {
  return uniquePath(existingPaths, "inbox", title, "task");
}

export function uniqueListPath(
  existingPaths: Iterable<string>,
  title: string,
): string {
  return uniquePath(existingPaths, "lists", title, "list");
}

function todayFrom(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function applyCatalogTaskToRepository(
  repository: TaskRepository,
  next: Task,
  previous?: Task,
): Promise<void> {
  const path = next.sourcePath ?? previous?.sourcePath;
  if (!path) throw new Error("Task is missing a vault path");
  const at = next.updatedAt || new Date().toISOString();

  const canceled = isCanceled(next) && (!previous || !isCanceled(previous));
  const completed = isCompleted(next) && (!previous || !isCompleted(previous));
  const reopened =
    isOpen(next) &&
    Boolean(previous && (isCompleted(previous) || isCanceled(previous)));
  if (canceled) {
    await repository.cancel(path, at);
  } else if (completed) {
    await repository.complete(path, next.completedAt ?? at);
  } else if (reopened) {
    await repository.reopen(path, at);
  }

  if (next.priority !== previous?.priority) {
    await repository.setPriority(path, next.priority, at);
  }

  if (next.title !== previous?.title) {
    await repository.setTitle(path, next.title, at);
  }

  if (!completed && Boolean(next.inbox) !== Boolean(previous?.inbox)) {
    await repository.setInbox(path, Boolean(next.inbox), at);
  }

  if (!completed) {
    const nextStart = catalogStart(next);
    const previousStart = previous ? catalogStart(previous) : null;
    if (!previousStart || !startsEqual(nextStart, previousStart)) {
      await repository.setStart(path, nextStart, at);
    }

    const nextPlan = catalogPlan(next);
    const previousPlan = previous ? catalogPlan(previous) : undefined;
    if (!plansEqual(nextPlan, previousPlan)) {
      await repository.planFor(path, nextPlan, at);
    }
  }

  const deadline = next.deadline ?? next.dueAt;
  const previousDeadline = previous?.deadline ?? previous?.dueAt;
  if (deadline !== previousDeadline) {
    await repository.setDeadline(path, deadline, at);
  }

  if (
    !repeatsEqual(next.repeat, previous?.repeat) ||
    (previous?.unparsedRepeat !== undefined &&
      next.unparsedRepeat === undefined)
  ) {
    await repository.setRepeat(path, next.repeat, at);
  }
  if (!trackingEqual(next.tracking, previous?.tracking)) {
    await repository.setTracking(path, next.tracking, at);
  }

  if (next.listId !== previous?.listId) {
    const lists = await repository.lists();
    let list = next.listId
      ? lists.find((entry) => listsMatch(entry, next.listId!))
      : undefined;
    if (!list && next.listId) {
      list = await repository.createList({
        path: uniqueListPath(
          lists.map((entry) => entry.path),
          next.listId,
        ),
        title: next.listId,
        at,
      });
    }
    await repository.moveToList(path, list?.path ?? null, at);
  }
}

export async function createCatalogTaskInRepository(
  repository: TaskRepository,
  input: TaskQuickCreateInput,
  options: { existingPaths: Iterable<string>; now?: Date },
): Promise<Task> {
  const now = options.now ?? new Date();
  const at = now.toISOString();
  const today = todayFrom(now);
  const path = uniqueInboxPath(options.existingPaths, input.title);
  const when =
    input.when ??
    (input.view === "today"
      ? "today"
      : input.view === "anytime"
        ? "anytime"
        : input.view === "someday"
          ? "someday"
          : undefined);
  const created = await repository.create({
    path,
    title: input.title,
    id: crypto.randomUUID(),
    at,
    inbox: input.view === "inbox",
  });
  const previous = catalogTaskFromSummary(created);
  const next: Task = {
    ...previous,
    priority: input.priority,
    when,
    start: when === "someday" ? "someday" : "anytime",
    planDate:
      (input.scheduledAt ? taskDateOnly(input.scheduledAt) : undefined) ??
      (when === "today" || when === "this-evening" ? today : undefined),
    planAt:
      input.planAt ??
      (when === "this-evening"
        ? "evening"
        : when === "today"
          ? "anytime"
          : undefined),
    dueAt: input.dueAt,
    deadline: input.dueAt,
    listId: input.area ?? undefined,
    areas: input.area ? [input.area] : [],
    inbox: input.view === "inbox",
    updatedAt: at,
  };
  await applyCatalogTaskToRepository(repository, next, previous);
  const summary = await repository.get(created.id);
  return summary
    ? {
        ...catalogTaskFromSummary(summary),
        listId: next.listId,
        areas: next.areas,
      }
    : next;
}

export async function deleteCatalogTaskFromRepository(
  repository: TaskRepository,
  task: Task,
): Promise<void> {
  if (!task.sourcePath) throw new Error("Task is missing a vault path");
  await repository.remove(task.sourcePath);
}
