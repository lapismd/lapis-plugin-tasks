import { catalogTaskFromSummary } from "./catalog-adapter";
import {
  listTreeFromAreas,
  toListNavNode,
  type TaskListNavigationSnapshot,
} from "./list-navigation";
import type { TaskRepository } from "./task-repository";
import type { Task, TaskBucket, TaskCatalogPlanAt, TaskStatus, TaskWhen } from "./types";
import {
  DEFAULT_TASKS_PLUGIN_SETTINGS,
  isTaskClockTime,
  type TasksPluginSettings,
} from "../tasks-settings";

export type TaskPlannerDateGroup = {
  date: string;
  label: string;
  tasks: Task[];
};

export type TaskPlannerUpcomingRow =
  | {
      kind: "month";
      id: string;
      date: string;
      label: string;
    }
  | {
      kind: "day";
      date: string;
      dayNumber: string;
      weekday: string;
      tasks: Task[];
    }
  | {
      kind: "gap";
      id: string;
      startDate: string;
      endDate: string;
      dayCount: number;
      label: string;
    };

export type TaskAreaSummary = {
  id: string;
  title: string;
  count: number;
};

export type TaskPlannerRowContext = {
  index: number;
  total: number;
  group: string;
  tasks: Task[];
  selected?: boolean;
  selectionPosition?: PlannerSelectionPosition | null;
  dragged?: boolean;
};

export type TaskPlannerPlacement =
  | "today"
  | "tomorrow"
  | "this-evening"
  | "anytime"
  | "someday"
  | "clear";

export type TaskPlannerQuickPlacement = Extract<
  TaskPlannerPlacement,
  "today" | "tomorrow" | "this-evening" | "anytime" | "someday"
>;

export type TaskPlanAtDayPart = "anytime" | "morning" | "afternoon" | "evening";

export const TASK_PLAN_AT_DAY_PARTS = [
  "morning",
  "afternoon",
  "evening",
  "anytime",
] as const satisfies readonly TaskPlanAtDayPart[];

export function isTaskPlanAtDayPart(
  value: string | null | undefined,
): value is TaskPlanAtDayPart {
  return (
    value === "anytime" ||
    value === "morning" ||
    value === "afternoon" ||
    value === "evening"
  );
}

export type TaskPlannerPlacementSource =
  | "scheduledAt"
  | "dueAt"
  | "when"
  | "completedAt"
  | "none";

export type TaskPlannerDropTarget =
  | {
      bucket: "inbox" | "today" | "anytime" | "someday" | "review" | "logbook";
    }
  | {
      bucket: "upcoming";
      date?: string;
    };

export type TaskPlannerMovePatch = {
  dueAt?: string | null;
  scheduledAt?: string | null;
  when?: TaskWhen | null;
  start?: "anytime" | "someday" | string | null;
  planDate?: string | null;
  planAt?: TaskCatalogPlanAt | null;
  deadline?: string | null;
  inbox?: boolean;
  listId?: string | null;
  status?: TaskStatus;
  completedAt?: string | null;
  order?: number;
  updatedAt?: string;
};

export type PlannerSelectionPosition = "single" | "first" | "middle" | "last";

export type TaskPlannerSnapshot = {
  inbox: Task[];
  today: Task[];
  thisEvening: Task[];
  upcoming: TaskPlannerDateGroup[];
  upcomingRows: TaskPlannerUpcomingRow[];
  anytime: Task[];
  someday: Task[];
  review: Task[];
  logbook: TaskPlannerDateGroup[];
  areas: TaskAreaSummary[];
  listTree: TaskListNavigationSnapshot;
};

export type TaskDaySection =
  | "anytime"
  | "morning"
  | "afternoon"
  | "evening"
  | "done";

export type TaskPlannerDaySnapshot = {
  date: string;
  anytime: Task[];
  morning: Task[];
  afternoon: Task[];
  evening: Task[];
  done: Task[];
};

export type TaskPlannerWeekDay = {
  date: string;
  weekday: string;
  dayNumber: number;
  selected: boolean;
  today: boolean;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function taskDateOnly(value: string | undefined | null) {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  if (match?.[1]) return match[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed.toISOString().slice(0, 10);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addPlannerDays(dateOnly: string, days: number): string {
  const date = parseDateOnly(dateOnly);
  return date ? formatDateOnly(addDays(date, days)) : dateOnly;
}

export function buildTaskPlannerWeek(
  selectedDate: string,
  today: string,
): TaskPlannerWeekDay[] {
  const selected = parseDateOnly(selectedDate) ?? startOfLocalDay(new Date());
  const mondayOffset = (selected.getDay() + 6) % 7;
  const monday = addDays(selected, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const dateOnly = formatDateOnly(date);
    return {
      date: dateOnly,
      weekday: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date),
      dayNumber: date.getDate(),
      selected: dateOnly === selectedDate,
      today: dateOnly === today,
    };
  });
}

function dayCount(startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) return 0;
  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / DAY_IN_MS) + 1,
  );
}

function humanDateLabel(dateOnly: string, today: string) {
  const date = parseDateOnly(dateOnly);
  const todayDate = parseDateOnly(today);
  if (!date || !todayDate) return dateOnly;
  const distance = Math.round(
    (date.getTime() - todayDate.getTime()) / DAY_IN_MS,
  );
  if (distance === 0) return "Today";
  if (distance === 1) return "Tomorrow";
  if (distance === -1) return "Yesterday";
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function dayDistance(dateOnly: string, today: string) {
  const date = parseDateOnly(dateOnly);
  const todayDate = parseDateOnly(today);
  if (!date || !todayDate) return null;
  return Math.round((date.getTime() - todayDate.getTime()) / DAY_IN_MS);
}

function monthKey(dateOnly: string) {
  return dateOnly.slice(0, 7);
}

function monthLabel(dateOnly: string) {
  const date = parseDateOnly(dateOnly);
  if (!date) return dateOnly;
  return new Intl.DateTimeFormat("en", { month: "long" }).format(date);
}

function maybePushMonthRow(
  rows: TaskPlannerUpcomingRow[],
  date: string,
  previousMonthKey: string,
) {
  const key = monthKey(date);
  if (key === previousMonthKey) return previousMonthKey;
  rows.push({
    kind: "month",
    id: `month:${key}`,
    date,
    label: monthLabel(date),
  });
  return key;
}

function buildUpcomingDayRow(
  date: string,
  tasks: Task[],
  today: string,
): TaskPlannerUpcomingRow {
  const parsed = parseDateOnly(date);
  const distance = dayDistance(date, today);
  return {
    kind: "day",
    date,
    dayNumber: parsed ? String(parsed.getDate()) : date,
    weekday:
      distance === 1
        ? "Tomorrow"
        : parsed
          ? new Intl.DateTimeFormat("en", { weekday: "long" }).format(parsed)
          : date,
    tasks: [...tasks].sort(comparePlannerTasks),
  };
}

function buildUpcomingGapRow(
  startDate: string,
  endDate: string,
): TaskPlannerUpcomingRow {
  const count = dayCount(startDate, endDate);
  return {
    kind: "gap",
    id: `gap:${startDate}:${endDate}`,
    startDate,
    endDate,
    dayCount: count,
    label:
      count === 1 ? "No activity for 1 day" : `No activity for ${count} days`,
  };
}

function isCompleted(task: Task) {
  return (
    task.status === "done" ||
    task.status === "completed" ||
    task.status === "canceled" ||
    Boolean(task.completedAt)
  );
}

function isCanceled(task: Task) {
  return task.status === "canceled";
}

function isTerminalCompleted(task: Task) {
  return !isCanceled(task) && isCompleted(task);
}

export function resolveTaskDaySection(
  task: Pick<Task, "planAt" | "when">,
  settings: TasksPluginSettings = DEFAULT_TASKS_PLUGIN_SETTINGS,
): Exclude<TaskDaySection, "done"> {
  if (task.planAt === "morning" || task.planAt === "afternoon") {
    return task.planAt;
  }
  if (task.planAt === "evening" || task.when === "this-evening") {
    return "evening";
  }
  if (!isTaskClockTime(task.planAt)) return "anytime";
  if (task.planAt < settings.dayParts.afternoonStartsAt) return "morning";
  if (task.planAt < settings.dayParts.eveningStartsAt) return "afternoon";
  return "evening";
}

function taskEligibleForDay(
  task: Task,
  selectedDate: string,
  actualToday: string,
) {
  const planDate = taskDateOnly(task.planDate) ?? taskDateOnly(task.scheduledAt);
  const deadline = taskDateOnly(task.deadline) ?? taskDateOnly(task.dueAt);
  if (
    (planDate && planDate <= selectedDate) ||
    (deadline && deadline <= selectedDate)
  ) {
    return true;
  }
  return (
    selectedDate === actualToday &&
    (task.when === "today" || task.when === "this-evening")
  );
}

function compareDaySectionTasks(left: Task, right: Task) {
  const leftOrder = left.order ?? left.todayOrder;
  const rightOrder = right.order ?? right.todayOrder;
  if (leftOrder !== undefined || rightOrder !== undefined) {
    return comparePlannerTasks(left, right);
  }
  const leftTime = isTaskClockTime(left.planAt) ? left.planAt : "";
  const rightTime = isTaskClockTime(right.planAt) ? right.planAt : "";
  return leftTime.localeCompare(rightTime) || comparePlannerTasks(left, right);
}

export function buildTaskPlannerDaySnapshot(
  tasks: Task[],
  selectedDate: string,
  settings: TasksPluginSettings = DEFAULT_TASKS_PLUGIN_SETTINGS,
  actualToday = selectedDate,
): TaskPlannerDaySnapshot {
  const snapshot: TaskPlannerDaySnapshot = {
    date: selectedDate,
    anytime: [],
    morning: [],
    afternoon: [],
    evening: [],
    done: [],
  };
  for (const task of tasks) {
    if (isTerminalCompleted(task)) {
      if (taskDateOnly(task.completedAt) === selectedDate) snapshot.done.push(task);
      continue;
    }
    if (isCanceled(task) || !taskEligibleForDay(task, selectedDate, actualToday)) {
      continue;
    }
    snapshot[resolveTaskDaySection(task, settings)].push(task);
  }
  snapshot.anytime.sort(compareDaySectionTasks);
  snapshot.morning.sort(compareDaySectionTasks);
  snapshot.afternoon.sort(compareDaySectionTasks);
  snapshot.evening.sort(compareDaySectionTasks);
  snapshot.done.sort(comparePlannerTasks);
  return snapshot;
}

function taskPlannerDate(task: Task) {
  return (
    taskDateOnly(task.planDate) ??
    taskDateOnly(task.scheduledAt) ??
    taskDateOnly(task.deadline) ??
    taskDateOnly(task.dueAt)
  );
}

function hasPlannerOverride(task: Task) {
  if (task.start === "someday" || task.when === "someday") return true;
  return task.when === "anytime" && !taskPlannerDate(task);
}

function taskScheduledOrDueDate(task: Task) {
  if (hasPlannerOverride(task)) return null;
  return taskPlannerDate(task);
}

function activeTaskPatch(task: Task): TaskPlannerMovePatch {
  return isCompleted(task)
    ? {
        status: "open",
        completedAt: null,
      }
    : {};
}

function compactMovePatch(patch: TaskPlannerMovePatch): TaskPlannerMovePatch {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as TaskPlannerMovePatch;
}

export function classifyTask(
  task: Task,
  today = formatDateOnly(new Date()),
): TaskBucket {
  if (isCompleted(task)) return "logbook";
  if (task.inbox) return "inbox";
  if (task.start === "someday" || task.when === "someday") return "someday";
  const planDate = taskDateOnly(task.planDate) ?? taskDateOnly(task.scheduledAt);
  const deadline = taskDateOnly(task.deadline) ?? taskDateOnly(task.dueAt);
  const startDate = taskDateOnly(
    task.start && task.start !== "anytime" && task.start !== "someday"
      ? task.start
      : undefined,
  );
  if (planDate && planDate < today) return "review";
  if (
    task.when === "this-evening" ||
    task.when === "today" ||
    task.planAt === "evening"
  ) {
    if (!planDate || planDate <= today) return "today";
  }
  if ((planDate && planDate <= today) || (deadline && deadline <= today)) {
    return "today";
  }
  if (
    (startDate && startDate > today) ||
    (planDate && planDate > today) ||
    (deadline && deadline > today)
  ) {
    return "upcoming";
  }
  return "anytime";
}

export function getTaskPlannerPlacementSource(
  task: Task,
): TaskPlannerPlacementSource {
  if (isCompleted(task)) return "completedAt";
  if (task.when) return "when";
  if (taskDateOnly(task.planDate) || taskDateOnly(task.scheduledAt)) {
    return "scheduledAt";
  }
  if (taskDateOnly(task.deadline) || taskDateOnly(task.dueAt)) return "dueAt";
  return "none";
}

export function keptPlanAtForDate(current?: {
  planAt?: string | null;
  when?: string | null;
}): { planAt: TaskCatalogPlanAt; when: TaskWhen | null } {
  if (current?.when === "this-evening" || current?.planAt === "evening") {
    return { planAt: "evening", when: "this-evening" };
  }
  if (
    current?.planAt &&
    (isTaskPlanAtDayPart(current.planAt) || /^\d{2}:\d{2}$/.test(current.planAt))
  ) {
    return { planAt: current.planAt, when: null };
  }
  return { planAt: "anytime", when: null };
}

export function resolveTaskPlannerPlacement(
  placement: TaskPlannerPlacement,
  now = new Date(),
  current?: { planAt?: string | null; when?: string | null },
): Pick<
  TaskPlannerMovePatch,
  "scheduledAt" | "when" | "start" | "planDate" | "planAt"
> {
  const today = formatDateOnly(now);
  const kept = keptPlanAtForDate(current);
  if (placement === "today") {
    return {
      scheduledAt: today,
      when: kept.when,
      start: "anytime",
      planDate: today,
      planAt: kept.planAt,
    };
  }
  if (placement === "tomorrow") {
    const tomorrow = formatDateOnly(addDays(now, 1));
    return {
      scheduledAt: tomorrow,
      when: kept.when,
      start: "anytime",
      planDate: tomorrow,
      planAt: kept.planAt,
    };
  }
  if (placement === "this-evening") {
    return {
      scheduledAt: today,
      when: "this-evening",
      start: "anytime",
      planDate: today,
      planAt: "evening",
    };
  }
  if (placement === "anytime") {
    return {
      scheduledAt: null,
      when: "anytime",
      start: "anytime",
      planDate: null,
      planAt: null,
    };
  }
  if (placement === "someday") {
    return {
      scheduledAt: null,
      when: "someday",
      start: "someday",
      planDate: null,
      planAt: null,
    };
  }
  return {
    scheduledAt: null,
    when: null,
    planDate: null,
    planAt: null,
  };
}

export function resolveTaskPlanAt(
  at: TaskPlanAtDayPart,
  current?: {
    scheduledAt?: string | null;
    planDate?: string | null;
    when?: TaskWhen | null;
    start?: string | null;
  },
  now = new Date(),
): Pick<
  TaskPlannerMovePatch,
  "scheduledAt" | "when" | "start" | "planDate" | "planAt"
> {
  const today = formatDateOnly(now);
  const date =
    taskDateOnly(current?.planDate) ?? taskDateOnly(current?.scheduledAt);
  if (at === "anytime" && (current?.when === "someday" || current?.start === "someday") && !date) {
    return {
      scheduledAt: null,
      when: "someday",
      start: "someday",
      planDate: null,
      planAt: null,
    };
  }
  if (at === "anytime") {
    return {
      scheduledAt: date,
      when: current?.when === "this-evening" ? null : (current?.when ?? null),
      start:
        current?.start === "someday"
          ? "anytime"
          : (current?.start ?? "anytime"),
      planDate: date,
      planAt: date ? "anytime" : null,
    };
  }
  const plannedDate = date ?? today;
  return {
    scheduledAt: plannedDate,
    when: at === "evening" ? "this-evening" : null,
    start: "anytime",
    planDate: plannedDate,
    planAt: at,
  };
}

export function buildTaskPlannerMovePatch(
  task: Task,
  target: TaskPlannerDropTarget,
  now = new Date(),
): TaskPlannerMovePatch {
  const updatedAt = now.toISOString();
  const activePatch = activeTaskPatch(task);
  if (target.bucket === "inbox") {
    return compactMovePatch({
      ...activePatch,
      inbox: true,
      updatedAt,
    });
  }
  if (target.bucket === "review") {
    return compactMovePatch({
      ...activePatch,
      updatedAt,
    });
  }
  if (target.bucket === "today") {
    return compactMovePatch({
      ...activePatch,
      ...resolveTaskPlannerPlacement("today", now),
      updatedAt,
    });
  }

  if (target.bucket === "anytime") {
    return compactMovePatch({
      ...activePatch,
      ...resolveTaskPlannerPlacement("anytime", now),
      updatedAt,
    });
  }

  if (target.bucket === "someday") {
    return compactMovePatch({
      ...activePatch,
      ...resolveTaskPlannerPlacement("someday", now),
      updatedAt,
    });
  }

  if (target.bucket === "logbook") {
    return compactMovePatch({
      status: "completed",
      completedAt: task.completedAt ?? updatedAt,
      updatedAt,
    });
  }

  if (target.bucket === "upcoming" && target.date) {
    const date = taskDateOnly(target.date) ?? target.date;
    const source = getTaskPlannerPlacementSource(task);
    const kept = keptPlanAtForDate(task);
    const datePatch =
      source === "dueAt"
        ? { dueAt: date, deadline: date, when: null }
        : {
            scheduledAt: date,
            planDate: date,
            planAt: kept.planAt,
            start: "anytime" as const,
            when: kept.when,
          };
    return compactMovePatch({
      ...activePatch,
      ...datePatch,
      updatedAt,
    });
  }

  return compactMovePatch({ ...activePatch, updatedAt });
}

export function buildTaskPlannerDaySectionPatch(
  task: Task,
  section: TaskDaySection,
  selectedDate: string,
  now = new Date(),
): TaskPlannerMovePatch {
  const updatedAt = now.toISOString();
  if (section === "done") {
    return compactMovePatch({
      status: "completed",
      completedAt: task.completedAt ?? updatedAt,
      updatedAt,
    });
  }
  return compactMovePatch({
    ...activeTaskPatch(task),
    scheduledAt: selectedDate,
    planDate: selectedDate,
    planAt: section,
    when: section === "evening" ? "this-evening" : null,
    start: "anytime",
    updatedAt,
  });
}

export function comparePlannerTasks(left: Task, right: Task) {
  const leftOrder = left.order ?? left.todayOrder ?? left.areaOrder;
  const rightOrder = right.order ?? right.todayOrder ?? right.areaOrder;
  if (
    leftOrder !== undefined &&
    rightOrder !== undefined &&
    leftOrder !== rightOrder
  ) {
    return leftOrder - rightOrder;
  }
  if (leftOrder !== undefined) return -1;
  if (rightOrder !== undefined) return 1;
  return (
    right.updatedAt.localeCompare(left.updatedAt) ||
    left.title.localeCompare(right.title)
  );
}

function groupByDate(
  tasks: Task[],
  dateForTask: (task: Task) => string,
  today: string,
  direction: "asc" | "desc",
) {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const date = dateForTask(task);
    const current = groups.get(date);
    if (current) current.push(task);
    else groups.set(date, [task]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) =>
      direction === "asc"
        ? left.localeCompare(right)
        : right.localeCompare(left),
    )
    .map(([date, groupTasks]) => ({
      date,
      label: humanDateLabel(date, today),
      tasks: [...groupTasks].sort(comparePlannerTasks),
    }));
}

export function buildUpcomingRows(
  groups: TaskPlannerDateGroup[],
  today: string,
  visibleDayCount = 7,
): TaskPlannerUpcomingRow[] {
  const taskGroups = new Map(groups.map((group) => [group.date, group.tasks]));
  const rows: TaskPlannerUpcomingRow[] = [];
  const baseDate = parseDateOnly(today) ?? startOfLocalDay(new Date());

  let previousMonthKey = monthKey(today);
  const nearEndDate = addDays(baseDate, Math.max(1, visibleDayCount));

  for (let dayOffset = 1; dayOffset <= visibleDayCount; dayOffset += 1) {
    const date = formatDateOnly(addDays(baseDate, dayOffset));
    previousMonthKey = maybePushMonthRow(rows, date, previousMonthKey);
    rows.push(buildUpcomingDayRow(date, taskGroups.get(date) ?? [], today));
    taskGroups.delete(date);
  }

  const futureDates = [...taskGroups.keys()]
    .filter((date) => date > formatDateOnly(nearEndDate))
    .sort((left, right) => left.localeCompare(right));
  let cursor = addDays(nearEndDate, 1);

  for (const date of futureDates) {
    const taskDate = parseDateOnly(date);
    if (!taskDate) continue;

    const gapEnd = addDays(taskDate, -1);
    if (cursor.getTime() <= gapEnd.getTime()) {
      const startDate = formatDateOnly(cursor);
      const endDate = formatDateOnly(gapEnd);
      previousMonthKey = maybePushMonthRow(rows, startDate, previousMonthKey);
      rows.push(buildUpcomingGapRow(startDate, endDate));
    }

    previousMonthKey = maybePushMonthRow(rows, date, previousMonthKey);
    rows.push(buildUpcomingDayRow(date, taskGroups.get(date) ?? [], today));
    cursor = addDays(taskDate, 1);
  }

  return rows;
}

export async function buildTaskPlannerSnapshotFromRepository(
  repository: TaskRepository,
  now = new Date(),
): Promise<TaskPlannerSnapshot> {
  const structureDiagnostics = await repository.validateStructuralGraph();
  const today = formatDateOnly(now);
  const [
    inbox,
    todayTasks,
    anytime,
    upcoming,
    someday,
    review,
    logbook,
    lists,
  ] = await Promise.all([
    repository.inbox(today),
    repository.today(today),
    repository.anytime(today),
    repository.upcoming(today),
    repository.someday(),
    repository.review(today),
    repository.logbook(),
    repository.lists(),
  ]);
  const seen = new Set<string>();
  const tasks: Task[] = [];
  for (const summary of [
    ...inbox,
    ...todayTasks,
    ...anytime,
    ...upcoming,
    ...someday,
    ...review,
    ...logbook,
  ]) {
    if (seen.has(summary.id)) continue;
    seen.add(summary.id);
    const parent = await repository.parent(summary.path);
    tasks.push({
      ...catalogTaskFromSummary(summary),
      listId: parent?.kind === "task-list" ? parent.id : undefined,
      areas: parent?.kind === "task-list" ? [parent.title] : [],
    });
  }
  const snapshot = buildTaskPlannerSnapshot(tasks, now);
  if (lists.length) {
    snapshot.areas = lists
      .filter((list) => list.status === "active")
      .map((list) => ({
        id: list.id,
        title: list.title,
        count: tasks.filter((task) => task.listId === list.id).length,
      }))
      .sort((left, right) => left.title.localeCompare(right.title));
  }
  const counts = new Map(
    snapshot.areas.map((area) => [area.id, area.count] as const),
  );
  snapshot.listTree = await buildListNavigationSnapshot(repository, counts);
  snapshot.listTree.diagnostics.unshift(
    ...structureDiagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      field: diagnostic.target,
    })),
  );
  return snapshot;
}

export async function buildListNavigationSnapshot(
  repository: TaskRepository,
  counts: Map<string, number>,
): Promise<TaskListNavigationSnapshot> {
  const diagnostics: TaskListNavigationSnapshot["diagnostics"] = [];
  const documents = await repository.navigationDocuments();
  const navigation = await repository.navigation();
  for (const extra of documents) {
    if (navigation && extra.path !== navigation.path) {
      diagnostics.push({
        code: "extra-navigation-document",
        message: `Ignored extra navigation document ${extra.path}.`,
        field: extra.path,
      });
    }
  }
  const lists = (await repository.lists()).filter(
    (list) => list.status === "active",
  );
  for (const list of lists) {
    const parents = await repository.listParents(list.id);
    if (parents.length > 1) {
      diagnostics.push({
        code: "multiple-list-parents",
        message: `${list.title} has more than one structural list parent.`,
        field: list.path,
      });
    }
  }
  const pins = await repository.navigationPins();
  for (const pin of pins) {
    if (!pin.ignored) continue;
    diagnostics.push({
      code: "ignored-navigation-pin",
      message: `${pin.list.title} is nested under a list and was not pinned.`,
      field: pin.list.path,
    });
  }
  const pinned = pins.filter(
    (pin) => !pin.ignored && pin.list.status !== "archived",
  );
  const sections = new Map<string, TaskListNavigationSnapshot["sections"][number]>();
  for (const pin of pinned) {
    const children = await repository.listChildren(pin.list.id);
    const node = toListNavNode(
      pin.list,
      counts.get(pin.list.id) ?? 0,
      children
        .filter((child) => child.status !== "archived")
        .map((child) =>
          toListNavNode(child, counts.get(child.id) ?? 0, [], {
            parentId: pin.list.id,
          }),
        ),
      { section: pin.section },
    );
    node.hasChildren = children.length > 0;
    const current = sections.get(pin.section) ?? {
      title: pin.section,
      lists: [],
    };
    current.lists.push(node);
    sections.set(pin.section, current);
  }
  const unpinned = await repository.unpinnedRoots();
  return {
    sections: [...sections.values()],
    unpinned: await Promise.all(
      unpinned.map(async (list) => {
        const children = (await repository.listChildren(list.id)).filter(
          (child) => child.status !== "archived",
        );
        const node = toListNavNode(
          list,
          counts.get(list.id) ?? 0,
          [],
        );
        node.hasChildren = children.length > 0;
        return node;
      }),
    ),
    diagnostics,
  };
}

export function buildTaskPlannerSnapshot(
  tasks: Task[],
  now = new Date(),
): TaskPlannerSnapshot {
  const today = formatDateOnly(now);
  const buckets: Record<TaskBucket, Task[]> = {
    inbox: [],
    today: [],
    upcoming: [],
    anytime: [],
    someday: [],
    review: [],
    logbook: [],
  };
  for (const task of tasks) {
    buckets[classifyTask(task, today)].push(task);
  }
  const upcoming = groupByDate(
    buckets.upcoming,
    (task) => taskScheduledOrDueDate(task) ?? today,
    today,
    "asc",
  );
  const logbook = groupByDate(
    buckets.logbook,
    (task) =>
      taskDateOnly(task.completedAt) ?? taskDateOnly(task.updatedAt) ?? today,
    today,
    "desc",
  );
  const areas = new Map<string, TaskAreaSummary>();
  for (const task of tasks) {
    if (isCompleted(task)) continue;
    const labels = task.areas.length
      ? task.areas
      : task.listId
        ? [task.listId]
        : [];
    for (const area of labels) {
      const key = area.toLowerCase();
      const current = areas.get(key);
      if (current) current.count += 1;
      else
        areas.set(key, {
          id: key.replace(/[^a-z0-9]+/g, "-"),
          title: area,
          count: 1,
        });
    }
  }
  return {
    inbox: [...buckets.inbox].sort(comparePlannerTasks),
    today: buckets.today
      .filter((task) => task.when !== "this-evening" && task.planAt !== "evening")
      .sort(comparePlannerTasks),
    thisEvening: buckets.today
      .filter((task) => task.when === "this-evening" || task.planAt === "evening")
      .sort(comparePlannerTasks),
    upcoming,
    upcomingRows: buildUpcomingRows(upcoming, today),
    anytime: [...buckets.anytime].sort(comparePlannerTasks),
    someday: [...buckets.someday].sort(comparePlannerTasks),
    review: [...buckets.review].sort(comparePlannerTasks),
    logbook,
    areas: [...areas.values()].sort((left, right) =>
      left.title.localeCompare(right.title),
    ),
    listTree: listTreeFromAreas(
      [...areas.values()].sort((left, right) =>
        left.title.localeCompare(right.title),
      ),
    ),
  };
}

export function getPlannerSelectionPosition(
  tasks: Pick<Task, "id">[],
  selectedTaskIds: Set<string>,
  taskId: string,
  index: number,
): PlannerSelectionPosition | null {
  if (!selectedTaskIds.has(taskId)) return null;

  const previousSelected = selectedTaskIds.has(tasks[index - 1]?.id ?? "");
  const nextSelected = selectedTaskIds.has(tasks[index + 1]?.id ?? "");

  if (previousSelected && nextSelected) return "middle";
  if (nextSelected) return "first";
  if (previousSelected) return "last";
  return "single";
}
