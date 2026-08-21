import type { TaskRepeat } from "./task-document";
import { RRule } from "rrule";
import {
  analyzeRecurrenceRule,
  isLocalDateString,
} from "./recurrence-engine";
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

export type TaskNaturalRepeatSuggestion = {
  input: string;
  label: string;
  rrule: string;
};

function sentenceCase(value: string): string {
  return value.length ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value;
}

/** Present a stored RRULE property value as reader-facing recurrence text. */
export function formatTaskRepeatRule(rrule: string): string {
  try {
    const text = RRule.fromString(rrule).toText();
    return text ? sentenceCase(text) : rrule;
  } catch {
    return rrule;
  }
}

function propertyValue(rule: RRule): string | null {
  const serialized = rule.toString();
  if (!serialized.startsWith("RRULE:")) return null;
  const parts = serialized.slice("RRULE:".length).split(";");
  const frequency = parts.find((part) => part.startsWith("FREQ="));
  if (!frequency) return null;
  return [frequency, ...parts.filter((part) => part !== frequency)].join(";");
}

/** Parse rrule.js natural-language input into a validated Tasks suggestion. */
export function buildNaturalTaskRepeatSuggestions(
  input: string,
): TaskNaturalRepeatSuggestion[] {
  const normalizedInput = input.trim();
  if (!normalizedInput) return [];
  try {
    const parsed = RRule.fromText(normalizedInput);
    const rrule = propertyValue(parsed);
    if (!rrule || analyzeRecurrenceRule(rrule).status === "invalid") return [];
    return [{
      input: normalizedInput,
      label: formatTaskRepeatRule(rrule),
      rrule,
    }];
  } catch {
    return [];
  }
}

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
    repeat.anchor === "schedule" &&
    repeat.missed === "carry" &&
    !repeat.resetChecklist &&
    !repeat.rdate?.length &&
    !repeat.exdate?.length &&
    !repeat.paused &&
    !repeat.pauseRanges?.length
  );
}

export function taskRepeatPresetFor(
  repeat?: TaskRepeat,
): TaskRepeatPreset {
  if (!repeat) return "none";
  if (!isSimplePreset(repeat)) return "custom";
  return (
    {
      "FREQ=DAILY": "daily",
      "FREQ=WEEKLY": "weekly",
      "FREQ=WEEKLY;INTERVAL=2": "biweekly",
      "FREQ=MONTHLY": "monthly",
      "FREQ=YEARLY": "yearly",
    } as const
  )[repeat.rrule] ?? "custom";
}

export function taskRepeatForPreset(
  preset: Exclude<TaskRepeatPreset, "custom">,
  current?: TaskRepeat,
  start: string | undefined = current?.start,
): TaskRepeat | undefined {
  if (preset === "none") return undefined;
  if (!isLocalDateString(start)) {
    throw new Error("A recurrence preset requires a date-only start.");
  }
  const rrule = {
    daily: "FREQ=DAILY",
    weekly: "FREQ=WEEKLY",
    biweekly: "FREQ=WEEKLY;INTERVAL=2",
    monthly: "FREQ=MONTHLY",
    yearly: "FREQ=YEARLY",
  }[preset];
  return {
    start,
    rrule,
    anchor: "schedule",
    missed: "carry",
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
