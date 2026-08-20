import {
  CalendarDate,
  getLocalTimeZone,
  type DateValue,
} from "@internationalized/date";
import { parseDate as parseChronoDate } from "chrono-node";

export type TaskDueTone = "today" | "upcoming" | "overdue";

export type TaskDueSummary = {
  shortDate: string;
  distance: string;
  tone: TaskDueTone;
};

export type TaskDateSuggestion = {
  id: string;
  label: string;
  date: string;
  dateLabel: string;
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeTaskDateOnly(value: string | undefined | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (DATE_ONLY_RE.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.valueOf())) return undefined;
  return formatDateOnly(parsed);
}

export function formatDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateOnly() {
  return formatDateOnly(new Date());
}

function parseDateOnlyUtc(value: string) {
  if (!DATE_ONLY_RE.test(value)) return null;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
}

export function getDayDistance(target: string, base: string) {
  const targetDate = parseDateOnlyUtc(target);
  const baseDate = parseDateOnlyUtc(base);
  if (!targetDate || !baseDate) return 0;
  return Math.round(
    (targetDate.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000),
  );
}

export function formatShortTaskDate(dateOnly: string) {
  const parsed = parseDateOnlyUtc(dateOnly);
  if (!parsed) return dateOnly;
  const month = parsed.toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
  });
  return `${parsed.getUTCDate()} ${month}`;
}

const CLOCK_RE = /^\d{2}:\d{2}$/;

export function formatTaskScheduleLabel(input: {
  when?: string | null;
  planAt?: string | null;
  scheduledAt?: string | null;
}): string | null {
  if (input.when === "this-evening" || input.planAt === "evening") {
    return "This Evening";
  }
  if (input.planAt === "morning") return "This Morning";
  if (input.planAt === "afternoon") return "This Afternoon";
  if (input.when === "someday") return "Someday";
  if (input.when === "anytime") return "Anytime";
  if (input.planAt && CLOCK_RE.test(input.planAt)) return input.planAt;
  const scheduled = normalizeTaskDateOnly(input.scheduledAt);
  if (!scheduled) return input.when === "today" ? "Today" : null;
  if (scheduled === todayDateOnly()) return "Today";
  return formatShortTaskDate(scheduled);
}

export function getDueSummary(dueAt?: string | null): TaskDueSummary | null {
  const dateOnly = normalizeTaskDateOnly(dueAt);
  if (!dateOnly) return null;

  const today = todayDateOnly();
  const distance = getDayDistance(dateOnly, today);
  let tone: TaskDueTone = "upcoming";
  let distanceLabel = "";

  if (distance === 0) {
    tone = "today";
    distanceLabel = "today";
  } else if (distance > 0) {
    distanceLabel = distance === 1 ? "1 day left" : `${distance} days left`;
  } else {
    tone = "overdue";
    const overdueDays = Math.abs(distance);
    distanceLabel =
      overdueDays === 1 ? "1 day ago" : `${overdueDays} days ago`;
  }

  return {
    shortDate: formatShortTaskDate(dateOnly),
    distance: distanceLabel,
    tone,
  };
}

export function calendarDateFromTaskValue(
  taskValue: string | null | undefined,
): DateValue | undefined {
  const dateOnly = normalizeTaskDateOnly(taskValue);
  if (!dateOnly) return undefined;
  const [year, month, day] = dateOnly.split("-").map((part) => Number(part));
  if (!year || !month || !day) return undefined;
  return new CalendarDate(year, month, day);
}

export function taskDateFromCalendarDate(date: DateValue) {
  const nativeDate = date.toDate(getLocalTimeZone());
  return formatDateOnly(nativeDate);
}

export function calendarDateFromDate(value: Date): DateValue {
  return new CalendarDate(
    value.getFullYear(),
    value.getMonth() + 1,
    value.getDate(),
  );
}

function dateOnlyFromDate(value: Date) {
  return formatDateOnly(value);
}

function formatSuggestionDate(value: Date) {
  return value.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

function shiftDate(
  base: Date,
  amount: number,
  unit: "day" | "week" | "month",
) {
  const nextDate = new Date(base);
  if (unit === "day") {
    nextDate.setDate(nextDate.getDate() + amount);
  } else if (unit === "week") {
    nextDate.setDate(nextDate.getDate() + amount * 7);
  } else {
    nextDate.setMonth(nextDate.getMonth() + amount);
  }
  return nextDate;
}

export function buildNaturalDateSuggestions(query: string): TaskDateSuggestion[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const numericMatch = /^([+-]?\d+)$/.exec(trimmed);
  if (numericMatch) {
    const rawAmount = Number(numericMatch[1]);
    if (Number.isFinite(rawAmount) && rawAmount !== 0) {
      const direction = rawAmount < 0 ? "earlier" : "later";
      const signedAmount = rawAmount;
      const absoluteAmount = Math.abs(rawAmount);
      const baseDate = new Date();
      return [
        {
          id: "days",
          label: `${absoluteAmount} day${absoluteAmount === 1 ? "" : "s"} ${direction}`,
          date: dateOnlyFromDate(shiftDate(baseDate, signedAmount, "day")),
          dateLabel: formatSuggestionDate(
            shiftDate(baseDate, signedAmount, "day"),
          ),
        },
        {
          id: "weeks",
          label: `${absoluteAmount} week${absoluteAmount === 1 ? "" : "s"} ${direction}`,
          date: dateOnlyFromDate(shiftDate(baseDate, signedAmount, "week")),
          dateLabel: formatSuggestionDate(
            shiftDate(baseDate, signedAmount, "week"),
          ),
        },
        {
          id: "months",
          label: `${absoluteAmount} month${absoluteAmount === 1 ? "" : "s"} ${direction}`,
          date: dateOnlyFromDate(shiftDate(baseDate, signedAmount, "month")),
          dateLabel: formatSuggestionDate(
            shiftDate(baseDate, signedAmount, "month"),
          ),
        },
      ];
    }
  }

  const parsed = parseChronoDate(trimmed);
  if (!parsed) return [];

  return [
    {
      id: "parsed",
      label: trimmed,
      date: dateOnlyFromDate(parsed),
      dateLabel: formatSuggestionDate(parsed),
    },
  ];
}

export function parseNaturalDueDate(query: string) {
  const suggestions = buildNaturalDateSuggestions(query);
  return suggestions[0]?.date;
}

function stripInlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/<((?:https?:\/\/|mailto:)[^>]+)>/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^>\s*/g, "")
    .replace(/^#{1,6}\s+/g, "")
    .replace(/^[-*+]\s+/g, "")
    .replace(/^\d+\.\s+/g, "")
    .replace(/[*_#[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function taskBodyExcerpt(body: string) {
  const firstLine = body
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? "";
  const plain = stripInlineMarkdown(firstLine);
  if (plain.length <= 72) return plain || "New task";
  return `${plain.slice(0, 72)}…`;
}

export function formatCompletedTimestamp(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Matches lapis-notes planner `PLANNER_ROW_CLOSE_ANIMATION_MS`. */
export const TASK_PREVIEW_CLOSE_ANIMATION_MS = 140;

/** Matches lapis-notes planner `.tasks-planner__task-expanded` expand duration. */
export const TASK_PREVIEW_EXPAND_ANIMATION_MS = 160;

/** Matches lapis-notes planner row shell transition duration. */
export const TASK_PREVIEW_SHELL_TRANSITION_MS = 160;

export function taskPreviewCloseAnimationMs(
  view: Window | null | undefined = typeof window !== "undefined"
    ? window
    : undefined,
) {
  if (view?.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return 0;
  }
  return TASK_PREVIEW_CLOSE_ANIMATION_MS;
}

