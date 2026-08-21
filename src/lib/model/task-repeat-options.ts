import type { TaskRepeat, TaskRepeatFrequency } from "./task-document";
import {
  normalizeTaskDateOnly,
  todayDateOnly,
} from "./task-dates";

export type TaskRepeatPreset =
  | "none"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly"
  | "custom";

export type TaskRepeatPresetOption = {
  value: Exclude<TaskRepeatPreset, "none" | "custom">;
  label: string;
  context?: string;
};

export type TaskRepeatPresentation = {
  referenceDate: string;
  referenceDateLabel: string;
  options: TaskRepeatPresetOption[];
};

function localDateFromDateOnly(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function ordinal(value: number) {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th`;
  const suffix = value % 10 === 1
    ? "st"
    : value % 10 === 2
      ? "nd"
      : value % 10 === 3
        ? "rd"
        : "th";
  return `${value}${suffix}`;
}

function isSimplePreset(repeat: TaskRepeat) {
  return (
    repeat.strategy === "rolling" &&
    repeat.anchor === "schedule" &&
    !repeat.resetChecklist &&
    !repeat.on?.length
  );
}

export function taskRepeatPresetFor(
  repeat?: TaskRepeat,
): TaskRepeatPreset {
  if (!repeat) return "none";
  if (!isSimplePreset(repeat)) return "custom";
  if (repeat.frequency === "weekly" && repeat.interval === 2) {
    return "biweekly";
  }
  if (repeat.interval === 1) return repeat.frequency;
  return "custom";
}

export function taskRepeatForPreset(
  preset: Exclude<TaskRepeatPreset, "custom">,
  current?: TaskRepeat,
): TaskRepeat | undefined {
  if (preset === "none") return undefined;
  const frequency: TaskRepeatFrequency =
    preset === "biweekly" ? "weekly" : preset;
  return {
    strategy: "rolling",
    frequency,
    interval: preset === "biweekly" ? 2 : 1,
    anchor: "schedule",
    ...(current?.lastCompletedAt
      ? { lastCompletedAt: current.lastCompletedAt }
      : {}),
    ...(current?.completionCount != null
      ? { completionCount: current.completionCount }
      : {}),
  };
}

export function buildTaskRepeatPresentation(
  plannedDate: string | null | undefined,
  now = new Date(),
): TaskRepeatPresentation {
  const explicitDate = normalizeTaskDateOnly(plannedDate);
  const today = todayDateOnly(now);
  const referenceDate = explicitDate ?? today;
  const date = localDateFromDateOnly(referenceDate) ?? now;
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return {
    referenceDate,
    referenceDateLabel: explicitDate
      ? explicitDate === today
        ? "Today"
        : date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })
      : "No planned date",
    options: [
      { value: "daily", label: "Daily" },
      { value: "weekly", label: "Weekly", context: `on ${weekday}` },
      {
        value: "biweekly",
        label: "Every 2 weeks",
        context: `on ${weekday}`,
      },
      {
        value: "monthly",
        label: "Monthly",
        context: `on the ${ordinal(date.getDate())}`,
      },
      { value: "yearly", label: "Yearly", context: `on ${monthDay}` },
    ],
  };
}
