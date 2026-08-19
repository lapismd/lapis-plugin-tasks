import type { Task, TaskBucket, TaskStatus, TaskWhen } from "./types";

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
  | "this-evening"
  | "anytime"
  | "someday"
  | "clear";

export type TaskPlannerPlacementSource =
  | "scheduledAt"
  | "dueAt"
  | "when"
  | "completedAt"
  | "none";

export type TaskPlannerDropTarget =
  | {
      bucket: "today" | "anytime" | "someday" | "logbook";
    }
  | {
      bucket: "upcoming";
      date?: string;
    };

export type TaskPlannerMovePatch = {
  dueAt?: string | null;
  scheduledAt?: string | null;
  when?: TaskWhen | null;
  status?: TaskStatus;
  completedAt?: string | null;
  order?: number;
  updatedAt?: string;
};

export type PlannerSelectionPosition = "single" | "first" | "middle" | "last";

export type TaskPlannerSnapshot = {
  today: Task[];
  thisEvening: Task[];
  upcoming: TaskPlannerDateGroup[];
  upcomingRows: TaskPlannerUpcomingRow[];
  anytime: Task[];
  someday: Task[];
  logbook: TaskPlannerDateGroup[];
  areas: TaskAreaSummary[];
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
  return task.status === "done" || Boolean(task.completedAt);
}

function taskPlannerDate(task: Task) {
  return taskDateOnly(task.scheduledAt) ?? taskDateOnly(task.dueAt);
}

function hasPlannerOverride(task: Task) {
  return task.when === "anytime" || task.when === "someday";
}

function taskScheduledOrDueDate(task: Task) {
  if (hasPlannerOverride(task)) return null;
  return taskPlannerDate(task);
}

function activeTaskPatch(task: Task): TaskPlannerMovePatch {
  return isCompleted(task)
    ? {
        status: "todo",
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
  if (task.when === "someday") return "someday";
  if (task.when === "anytime") return "anytime";
  if (task.when === "this-evening") return "today";
  if (task.when === "today") return "today";
  const date = taskScheduledOrDueDate(task);
  if (date && date <= today) return "today";
  if (date && date > today) return "upcoming";
  return "anytime";
}

export function getTaskPlannerPlacementSource(
  task: Task,
): TaskPlannerPlacementSource {
  if (isCompleted(task)) return "completedAt";
  if (task.when) return "when";
  if (taskDateOnly(task.scheduledAt)) return "scheduledAt";
  if (taskDateOnly(task.dueAt)) return "dueAt";
  return "none";
}

export function resolveTaskPlannerPlacement(
  placement: TaskPlannerPlacement,
  now = new Date(),
): Pick<TaskPlannerMovePatch, "scheduledAt" | "when"> {
  const today = formatDateOnly(now);
  if (placement === "today") {
    return { scheduledAt: today, when: null };
  }
  if (placement === "this-evening") {
    return { scheduledAt: today, when: "this-evening" };
  }
  if (placement === "anytime") {
    return { scheduledAt: null, when: "anytime" };
  }
  if (placement === "someday") {
    return { scheduledAt: null, when: "someday" };
  }
  return { scheduledAt: null, when: null };
}

export function buildTaskPlannerMovePatch(
  task: Task,
  target: TaskPlannerDropTarget,
  now = new Date(),
): TaskPlannerMovePatch {
  const updatedAt = now.toISOString();
  const activePatch = activeTaskPatch(task);
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
      status: "done",
      completedAt: task.completedAt ?? updatedAt,
      updatedAt,
    });
  }

  if (target.bucket === "upcoming" && target.date) {
    const date = taskDateOnly(target.date) ?? target.date;
    const source = getTaskPlannerPlacementSource(task);
    const datePatch =
      source === "dueAt" ? { dueAt: date } : { scheduledAt: date };
    return compactMovePatch({
      ...activePatch,
      ...datePatch,
      when: null,
      updatedAt,
    });
  }

  return compactMovePatch({ ...activePatch, updatedAt });
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

export function buildTaskPlannerSnapshot(
  tasks: Task[],
  now = new Date(),
): TaskPlannerSnapshot {
  const today = formatDateOnly(now);
  const buckets: Record<TaskBucket, Task[]> = {
    today: [],
    upcoming: [],
    anytime: [],
    someday: [],
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
    for (const area of task.areas) {
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
    today: buckets.today
      .filter((task) => task.when !== "this-evening")
      .sort(comparePlannerTasks),
    thisEvening: buckets.today
      .filter((task) => task.when === "this-evening")
      .sort(comparePlannerTasks),
    upcoming,
    upcomingRows: buildUpcomingRows(upcoming, today),
    anytime: [...buckets.anytime].sort(comparePlannerTasks),
    someday: [...buckets.someday].sort(comparePlannerTasks),
    logbook,
    areas: [...areas.values()].sort((left, right) =>
      left.title.localeCompare(right.title),
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

