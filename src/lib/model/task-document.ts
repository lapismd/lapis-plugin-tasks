import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { scanTaskStructure } from "./task-structure";
import {
  analyzeRecurrenceRule,
  isLocalDateString,
  type LocalDateString,
} from "./recurrence-engine";

export const TASK_DOCUMENT_SCHEMA = "tasks/v1";
export const TASK_PROJECTION_VERSION = 4;

export type TaskDocumentKind = "task" | "task-list" | "task-list-navigation";
export type CanonicalTaskStatus = "open" | "completed" | "canceled";
export type TaskListStatus = "active" | "archived";
export type TaskStartKind = "anytime" | "someday" | "date";
export type TaskPlanKind =
  | "anytime"
  | "morning"
  | "afternoon"
  | "evening"
  | "time";
export type TaskRepeatAnchor = "schedule" | "completion";
export type TaskRepeatMissed = "carry" | "skip";
export type StructuralLinkKind =
  | "task-entry"
  | "list-entry"
  | "reference"
  | "navigation-item";

export type TaskDiagnostic = {
  code: string;
  message: string;
  field?: string;
};

export type TaskStart =
  | { kind: "anytime" }
  | { kind: "someday" }
  | { kind: "date"; date: string };

export type TaskPlan = {
  date: string;
  at: TaskPlanKind;
  time?: string;
  duration?: string;
  durationMinutes?: number;
};

export type TaskRepeat = {
  start?: LocalDateString;
  rrule: string;
  anchor: TaskRepeatAnchor;
  missed: TaskRepeatMissed;
  rdate?: LocalDateString[];
  exdate?: LocalDateString[];
  resetChecklist?: boolean;
  paused?: boolean;
  pausedSince?: LocalDateString;
  pauseRanges?: Array<{
    start: LocalDateString;
    end: LocalDateString;
  }>;
  lastCompletedAt?: string;
  completionCount?: number;
};

export type TaskTracking =
  | { type: "boolean" }
  | { type: "count"; unit: string; target?: number }
  | { type: "duration"; target?: string }
  | { type: "number"; unit: string; target?: number };

export type TaskComment = {
  id: string;
  at: string;
  text: string;
  occurrence?: string;
  editedAt?: string;
  resolved?: boolean;
};

export type TaskFrontMatter = {
  status: CanonicalTaskStatus;
  priority?: "low" | "medium" | "high";
  unparsedPriority?: unknown;
  completedAt?: string;
  inbox: boolean;
  start: TaskStart;
  plan?: TaskPlan;
  deadline?: string;
  repeat?: TaskRepeat;
  /** Opaque invalid or legacy block retained during unrelated mutations. */
  unparsedRepeat?: unknown;
  tracking?: TaskTracking;
  /** Opaque invalid tracking block retained during unrelated mutations. */
  unparsedTracking?: unknown;
  comments: TaskComment[];
};

export type TaskListFrontMatter = {
  status: TaskListStatus;
  role?: "list" | "area";
};

export type StructuralLink = {
  title: string;
  href: string;
  kind: StructuralLinkKind;
  heading: string | null;
  ordinal: number;
  sourceStart?: number;
  sourceEnd?: number;
};

export type ChecklistItem = {
  text: string;
  checked: boolean;
  position: number;
  sourceStart: number;
  sourceEnd: number;
  source: string;
};

export type TaskDocument = {
  path: string;
  raw: string;
  id: string;
  kind: "task";
  title: string;
  tags: string[];
  created?: string;
  updated?: string;
  task: TaskFrontMatter;
  body: string;
  checklist: ChecklistItem[];
  structuralLinks: StructuralLink[];
  diagnostics: TaskDiagnostic[];
};

export type TaskListDocument = {
  path: string;
  raw: string;
  id: string;
  kind: "task-list";
  title: string;
  frontMatterTitle?: string;
  tags: string[];
  created?: string;
  updated?: string;
  list: TaskListFrontMatter;
  body: string;
  structuralLinks: StructuralLink[];
  diagnostics: TaskDiagnostic[];
};

export type TaskNavigationDocument = {
  path: string;
  raw: string;
  id: string;
  kind: "task-list-navigation";
  title: string;
  tags: string[];
  created?: string;
  updated?: string;
  body: string;
  structuralLinks: StructuralLink[];
  diagnostics: TaskDiagnostic[];
};

export type ParsedTaskFile =
  | TaskDocument
  | TaskListDocument
  | TaskNavigationDocument;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const DURATION_RE = /^(?:(\d+)h)?(?:(\d+)m)?$/i;

export function parseDurationMinutes(
  value: string | undefined,
): number | undefined {
  if (!value?.trim()) return undefined;
  const match = DURATION_RE.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return undefined;
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = match[2] ? Number(match[2]) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : undefined;
}

export function formatDuration(
  minutes: number | undefined,
): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours}h${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
}

function splitFrontMatter(raw: string): {
  frontMatter: Record<string, unknown>;
  body: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontMatter: {}, body: raw };
  try {
    const parsed = parseYaml(match[1] ?? "") as unknown;
    const frontMatter =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    return { frontMatter, body: raw.slice(match[0].length) };
  } catch {
    return { frontMatter: {}, body: raw.slice(match[0].length) };
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function firstHeading(body: string): string | undefined {
  const match = body.match(/^#\s+(.+?)\s*$/m);
  return match?.[1]?.trim();
}

function titleFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.md$/i, "") || path;
}

/** Human-readable compatibility label for a list whose page has no title. */
export function formatTaskListIdTitle(
  value: string | null | undefined,
): string | undefined {
  const normalized = value?.trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  if (!normalized) return undefined;
  return normalized
    .split(" ")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function parseNavigationBodyStructure(body: string): StructuralLink[] {
  const structuralLinks: StructuralLink[] = [];
  let heading: string | null = null;
  let ordinal = 0;
  const lines = body.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const headingMatch = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (headingMatch) {
      heading = headingMatch[1]!.trim();
      continue;
    }
    const markdownLink = line.match(
      /^\s*[-*]\s+(?:!\[[^\]]*\]\([^)]+\)|\[([^\]]+)\]\(([^)]+)\))\s*$/,
    );
    if (markdownLink?.[1] && markdownLink[2]) {
      structuralLinks.push({
        title: markdownLink[1],
        href: markdownLink[2],
        kind: "reference",
        heading,
        ordinal,
      });
      ordinal += 1;
    }
  }
  return structuralLinks;
}

function parseStart(value: unknown, diagnostics: TaskDiagnostic[]): TaskStart {
  if (value == null || value === "anytime") return { kind: "anytime" };
  if (value === "someday") return { kind: "someday" };
  if (typeof value === "string" && DATE_RE.test(value)) {
    return { kind: "date", date: value };
  }
  diagnostics.push({
    code: "invalid-start",
    field: "task.start",
    message: "start must be anytime, someday, or a YYYY-MM-DD date.",
  });
  return { kind: "anytime" };
}

function parsePlan(
  value: unknown,
  diagnostics: TaskDiagnostic[],
): TaskPlan | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const record = value as Record<string, unknown>;
  const date = asString(record.date);
  if (!date || !DATE_RE.test(date)) {
    diagnostics.push({
      code: "invalid-plan-date",
      field: "task.plan.date",
      message: "plan.date must be a YYYY-MM-DD date.",
    });
    return undefined;
  }
  const atRaw = asString(record.at) ?? "anytime";
  let at: TaskPlanKind = "anytime";
  let time: string | undefined;
  if (
    atRaw === "anytime" ||
    atRaw === "morning" ||
    atRaw === "afternoon" ||
    atRaw === "evening"
  ) {
    at = atRaw;
  } else if (TIME_RE.test(atRaw)) {
    at = "time";
    time = atRaw;
  } else {
    diagnostics.push({
      code: "invalid-plan-at",
      field: "task.plan.at",
      message:
        "plan.at must be anytime, morning, afternoon, evening, or HH:mm.",
    });
  }
  const duration = asString(record.duration);
  const durationMinutes = parseDurationMinutes(duration);
  if (duration && durationMinutes == null) {
    diagnostics.push({
      code: "invalid-duration",
      field: "task.plan.duration",
      message:
        "plan.duration must be a positive duration such as 45m or 1h30m.",
    });
  }
  return { date, at, time, duration, durationMinutes };
}

type ParsedTaskField<T> = {
  value?: T;
  unparsed?: unknown;
};

function invalidTaskField<T>(
  value: unknown,
  diagnostics: TaskDiagnostic[],
  code: string,
  field: string,
  message: string,
): ParsedTaskField<T> {
  diagnostics.push({ code, field, message });
  return { unparsed: value };
}

function parseDateList(value: unknown): LocalDateString[] | undefined | null {
  if (value == null) return undefined;
  if (!Array.isArray(value) || !value.every(isLocalDateString)) return null;
  return [...new Set(value)] as LocalDateString[];
}

function parsePauseRanges(value: unknown): TaskRepeat["pauseRanges"] | null {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return null;
  const ranges: NonNullable<TaskRepeat["pauseRanges"]> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      return null;
    const range = entry as Record<string, unknown>;
    if (
      !isLocalDateString(range.start) ||
      !isLocalDateString(range.end) ||
      range.end < range.start
    ) {
      return null;
    }
    ranges.push({ start: range.start, end: range.end });
  }
  return ranges;
}

function parseRepeat(
  value: unknown,
  diagnostics: TaskDiagnostic[],
): ParsedTaskField<TaskRepeat> {
  if (value == null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalidTaskField(
      value,
      diagnostics,
      "invalid-repeat",
      "task.repeat",
      "repeat must be an RRULE recurrence object.",
    );
  }
  const record = value as Record<string, unknown>;
  if (
    Object.hasOwn(record, "frequency") ||
    Object.hasOwn(record, "interval") ||
    Object.hasOwn(record, "strategy") ||
    Object.hasOwn(record, "on")
  ) {
    return invalidTaskField(
      value,
      diagnostics,
      "legacy-repeat",
      "task.repeat",
      "Legacy frequency/interval recurrence is retained but is no longer executable; replace or remove it in the recurrence editor.",
    );
  }

  const known = new Set([
    "start",
    "rrule",
    "anchor",
    "missed",
    "rdate",
    "exdate",
    "resetChecklist",
    "paused",
    "pausedSince",
    "pauseRanges",
    "lastCompletedAt",
    "completionCount",
  ]);
  const unknown = Object.keys(record).filter((key) => !known.has(key));
  const rrule = asString(record.rrule);
  const anchor = record.anchor ?? "schedule";
  const missed = record.missed ?? "carry";
  const start = record.start;
  const rdate = parseDateList(record.rdate);
  const exdate = parseDateList(record.exdate);
  const pauseRanges = parsePauseRanges(record.pauseRanges);
  const lastCompletedAt = asString(record.lastCompletedAt);
  const completionCount = record.completionCount;
  const invalid =
    unknown.length > 0 ||
    !rrule ||
    (anchor !== "schedule" && anchor !== "completion") ||
    (missed !== "carry" && missed !== "skip") ||
    (anchor === "schedule" && !isLocalDateString(start)) ||
    (start != null && !isLocalDateString(start)) ||
    (anchor === "completion" && missed !== "carry") ||
    rdate === null ||
    exdate === null ||
    pauseRanges === null ||
    (record.resetChecklist != null &&
      typeof record.resetChecklist !== "boolean") ||
    (record.paused != null && typeof record.paused !== "boolean") ||
    (record.paused === true && !isLocalDateString(record.pausedSince)) ||
    (record.paused !== true && record.pausedSince != null) ||
    (lastCompletedAt != null &&
      !Number.isFinite(Date.parse(lastCompletedAt))) ||
    (completionCount != null &&
      (!Number.isInteger(completionCount) || (completionCount as number) < 0));
  if (invalid) {
    return invalidTaskField(
      value,
      diagnostics,
      "invalid-repeat",
      "task.repeat",
      "repeat must use a valid RRULE, anchor/missed policy, date-only start and exceptions, pause ranges, and non-negative completionCount.",
    );
  }

  const analysis = analyzeRecurrenceRule(rrule);
  if (analysis.status === "invalid") {
    return invalidTaskField(
      value,
      diagnostics,
      "invalid-repeat-rule",
      "task.repeat.rrule",
      analysis.message,
    );
  }
  if (analysis.status === "unsupported") {
    diagnostics.push({
      code: "unsupported-repeat-rule",
      field: "task.repeat.rrule",
      message: `The RRULE is preserved but automatic advancement is blocked because Tasks does not execute: ${analysis.parts.join(", ")}.`,
    });
  }

  return {
    value: {
      ...(isLocalDateString(start) ? { start } : {}),
      rrule,
      anchor: anchor as TaskRepeatAnchor,
      missed: missed as TaskRepeatMissed,
      ...(rdate?.length ? { rdate } : {}),
      ...(exdate?.length ? { exdate } : {}),
      resetChecklist: record.resetChecklist === true,
      paused: record.paused === true,
      ...(isLocalDateString(record.pausedSince)
        ? { pausedSince: record.pausedSince }
        : {}),
      ...(pauseRanges?.length ? { pauseRanges } : {}),
      ...(lastCompletedAt ? { lastCompletedAt } : {}),
      ...(typeof completionCount === "number" ? { completionCount } : {}),
    },
  };
}

function parseTracking(
  value: unknown,
  hasRepeat: boolean,
  diagnostics: TaskDiagnostic[],
): ParsedTaskField<TaskTracking> {
  if (value == null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalidTaskField(
      value,
      diagnostics,
      "invalid-tracking",
      "task.tracking",
      "tracking must be a boolean, count, duration, or number object.",
    );
  }
  if (!hasRepeat) {
    return invalidTaskField(
      value,
      diagnostics,
      "tracking-without-repeat",
      "task.tracking",
      "tracking requires an executable or preserved RRULE recurrence.",
    );
  }
  const record = value as Record<string, unknown>;
  const type = asString(record.type);
  const unit = asString(record.unit);
  const target = record.target;
  const known = new Set(["type", "unit", "target"]);
  const invalidTarget =
    target != null &&
    (typeof target !== "number" || !Number.isFinite(target) || target <= 0);
  let tracking: TaskTracking | undefined;
  if (type === "boolean" && record.unit == null && target == null) {
    tracking = { type };
  } else if (
    (type === "count" || type === "number") &&
    unit &&
    !invalidTarget
  ) {
    tracking = {
      type,
      unit,
      ...(typeof target === "number" ? { target } : {}),
    };
  } else if (
    type === "duration" &&
    record.unit == null &&
    (target == null ||
      (typeof target === "string" && parseDurationMinutes(target) != null))
  ) {
    tracking = {
      type,
      ...(typeof target === "string" ? { target } : {}),
    };
  }
  if (!tracking || Object.keys(record).some((key) => !known.has(key))) {
    return invalidTaskField(
      value,
      diagnostics,
      "invalid-tracking",
      "task.tracking",
      "count and number tracking require a unit and optional positive target; duration accepts an optional positive duration target.",
    );
  }
  return { value: tracking };
}

function parseComments(value: unknown): TaskComment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const id = asString(record.id);
    const at = asString(record.at);
    const text = asString(record.text);
    if (!id || !at || !text) return [];
    return [
      {
        id,
        at,
        text,
        occurrence: asString(record.occurrence),
        editedAt: asString(record.editedAt),
        resolved: record.resolved === true ? true : undefined,
      },
    ];
  });
}

function parseTaskFrontMatter(
  value: unknown,
  diagnostics: TaskDiagnostic[],
): TaskFrontMatter {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const statusRaw = asString(record.status) ?? "open";
  const statuses: CanonicalTaskStatus[] = ["open", "completed", "canceled"];
  const status = statuses.includes(statusRaw as CanonicalTaskStatus)
    ? (statusRaw as CanonicalTaskStatus)
    : "open";
  if (statusRaw !== status) {
    diagnostics.push({
      code: "invalid-status",
      field: "task.status",
      message: "task.status must be open, completed, or canceled.",
    });
  }
  const start = parseStart(record.start, diagnostics);
  const plan = parsePlan(record.plan, diagnostics);
  if (start.kind === "someday" && plan) {
    diagnostics.push({
      code: "someday-plan",
      field: "task.plan",
      message: "A someday task must not also have an active plan.",
    });
  }
  if (start.kind === "date" && plan && plan.date < start.date) {
    diagnostics.push({
      code: "plan-before-start",
      field: "task.plan.date",
      message: "plan.date must not be before a dated start.",
    });
  }
  const repeat = parseRepeat(record.repeat, diagnostics);
  const tracking = parseTracking(
    record.tracking,
    Boolean(repeat.value),
    diagnostics,
  );
  return {
    status,
    priority: ["low", "medium", "high"].includes(String(record.priority))
      ? (record.priority as TaskFrontMatter["priority"])
      : undefined,
    unparsedPriority:
      record.priority != null &&
      !["low", "medium", "high"].includes(String(record.priority))
        ? record.priority
        : undefined,
    completedAt: asString(record.completedAt),
    inbox: record.inbox === true,
    start,
    plan,
    deadline: asString(record.deadline),
    repeat: repeat.value,
    unparsedRepeat: repeat.unparsed,
    tracking: tracking.value,
    unparsedTracking: tracking.unparsed,
    comments: parseComments(record.comments),
  };
}

function parseListFrontMatter(value: unknown): TaskListFrontMatter {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    status: record.status === "archived" ? "archived" : "active",
    role: record.role === "area" ? "area" : "list",
  };
}

function asNavigationLinks(links: StructuralLink[]): StructuralLink[] {
  const ordinals = new Map<string, number>();
  return links.map((link) => {
    const section = link.heading ?? "";
    const ordinal = ordinals.get(section) ?? 0;
    ordinals.set(section, ordinal + 1);
    return {
      ...link,
      kind: "navigation-item" as const,
      ordinal,
    };
  });
}

export function parseTaskDocument(
  raw: string,
  path = "untitled.md",
): ParsedTaskFile | null {
  const { frontMatter, body } = splitFrontMatter(raw);
  const type = asString(frontMatter.type);
  if (
    type !== "task" &&
    type !== "task-list" &&
    type !== "task-list-navigation"
  ) {
    return null;
  }
  const diagnostics: TaskDiagnostic[] = [];
  const id = asString(frontMatter.id);
  if (!id) {
    diagnostics.push({
      code: "missing-id",
      field: "id",
      message: "Task, task-list, and navigation files must have a stable id.",
    });
  }
  const frontMatterTitle = asString(frontMatter.title);
  const title =
    type === "task-list"
      ? (frontMatterTitle ??
        firstHeading(body) ??
        formatTaskListIdTitle(id) ??
        titleFromPath(path))
      : (firstHeading(body) ?? titleFromPath(path));
  const navigationLinks = parseNavigationBodyStructure(body);
  if (type === "task-list-navigation") {
    return {
      path,
      raw,
      id: id ?? "",
      kind: "task-list-navigation",
      title,
      tags: asStringArray(frontMatter.tags),
      created: asString(frontMatter.created),
      updated: asString(frontMatter.updated),
      body,
      structuralLinks: asNavigationLinks(navigationLinks),
      diagnostics,
    };
  }
  if (type === "task-list") {
    const structure = scanTaskStructure(raw, {
      documentId: id ?? "",
      documentPath: path,
      documentKind: "task-list",
    });
    return {
      path,
      raw,
      id: id ?? "",
      kind: "task-list",
      title,
      ...(frontMatterTitle ? { frontMatterTitle } : {}),
      tags: asStringArray(frontMatter.tags),
      created: asString(frontMatter.created),
      updated: asString(frontMatter.updated),
      list: parseListFrontMatter(frontMatter.list),
      body,
      structuralLinks: structure.candidates.map((entry, ordinal) => ({
        title: entry.authoredLabel,
        href: entry.authoredHref,
        kind: "reference",
        heading: entry.heading.text,
        ordinal,
        sourceStart: entry.sourceStart,
        sourceEnd: entry.sourceEnd,
      })),
      diagnostics,
    };
  }
  const structure = scanTaskStructure(raw, {
    documentId: id ?? "",
    documentPath: path,
    documentKind: "task",
  });
  return {
    path,
    raw,
    id: id ?? "",
    kind: "task",
    title,
    tags: asStringArray(frontMatter.tags),
    created: asString(frontMatter.created),
    updated: asString(frontMatter.updated),
    task: parseTaskFrontMatter(frontMatter.task, diagnostics),
    body,
    checklist: structure.checklist.map(
      ({ heading: _heading, ...item }) => item,
    ),
    structuralLinks: structure.candidates.map((entry, ordinal) => ({
      title: entry.authoredLabel,
      href: entry.authoredHref,
      kind: "reference",
      heading: entry.heading.text,
      ordinal,
      sourceStart: entry.sourceStart,
      sourceEnd: entry.sourceEnd,
    })),
    diagnostics,
  };
}

export function serializeTaskDocument(document: ParsedTaskFile): string {
  const common: Record<string, unknown> = {
    type: document.kind,
    id: document.id,
  };
  if (document.tags.length) common.tags = document.tags;
  if (document.created) common.created = document.created;
  if (document.updated) common.updated = document.updated;
  if (document.kind === "task-list-navigation") {
    const yaml = stringifyYaml(common, { lineWidth: 0 }).trimEnd();
    const body = document.body.replace(/^\n+/, "");
    return `---\n${yaml}\n---\n${body.startsWith("\n") ? body : `\n${body}`}`;
  }
  if (document.kind === "task-list") {
    if (document.frontMatterTitle) common.title = document.frontMatterTitle;
    common.list = {
      status: document.list.status,
      ...(document.list.role && document.list.role !== "list"
        ? { role: document.list.role }
        : {}),
    };
  } else {
    const start =
      document.task.start.kind === "date"
        ? document.task.start.date
        : document.task.start.kind;
    const plan = document.task.plan
      ? {
          date: document.task.plan.date,
          at:
            document.task.plan.at === "time"
              ? document.task.plan.time
              : document.task.plan.at,
          ...(document.task.plan.duration
            ? { duration: document.task.plan.duration }
            : {}),
        }
      : undefined;
    common.task = {
      status: document.task.status,
      ...(document.task.priority
        ? { priority: document.task.priority }
        : document.task.unparsedPriority !== undefined
          ? { priority: document.task.unparsedPriority }
          : {}),
      inbox: document.task.inbox,
      start,
      ...(document.task.completedAt
        ? { completedAt: document.task.completedAt }
        : {}),
      ...(plan ? { plan } : {}),
      ...(document.task.deadline ? { deadline: document.task.deadline } : {}),
      ...(document.task.repeat
        ? { repeat: document.task.repeat }
        : document.task.unparsedRepeat !== undefined
          ? { repeat: document.task.unparsedRepeat }
          : {}),
      ...(document.task.tracking
        ? { tracking: document.task.tracking }
        : document.task.unparsedTracking !== undefined
          ? { tracking: document.task.unparsedTracking }
          : {}),
      ...(document.task.comments.length
        ? { comments: document.task.comments }
        : {}),
    };
  }
  const originalMatch = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(
    document.raw,
  );
  const original = originalMatch
    ? (parseYaml(originalMatch[1]) as Record<string, unknown>)
    : {};
  const retained =
    original && typeof original === "object" ? { ...original } : {};
  for (const key of [
    "type",
    "id",
    "tags",
    "created",
    "updated",
    "title",
    "task",
    "list",
  ]) {
    if (key !== "task" && key !== "list") delete retained[key];
  }
  for (const key of ["task", "list"]) {
    const before = retained[key];
    const after = common[key];
    if (!after || typeof after !== "object") continue;
    const merged =
      before && typeof before === "object"
        ? { ...(before as Record<string, unknown>) }
        : {};
    const known =
      key === "task"
        ? [
            "status",
            "priority",
            "completedAt",
            "inbox",
            "start",
            "plan",
            "deadline",
            "repeat",
            "tracking",
            "comments",
          ]
        : ["status", "role"];
    for (const field of known) delete merged[field];
    common[key] = { ...merged, ...after };
  }
  const yaml = stringifyYaml(
    { ...retained, ...common },
    { lineWidth: 0 },
  ).trimEnd();
  const body = document.body.replace(/^\n+/, "");
  return `---\n${yaml}\n---\n${body.startsWith("\n") ? body : `\n${body}`}`;
}

export function resetChecklistItems(body: string, reset: boolean): string {
  if (!reset) return body;
  const items = scanTaskStructure(body, {
    documentId: "checklist-reset",
    documentPath: "checklist-reset.md",
    documentKind: "task",
  }).checklist;
  let next = body;
  for (const item of [...items].reverse()) {
    const source = next.slice(item.sourceStart, item.sourceEnd);
    const replacement = source.replace(/^(\s*[-*+]\s+)\[(?: |x|X)\]/, "$1[ ]");
    next = `${next.slice(0, item.sourceStart)}${replacement}${next.slice(item.sourceEnd)}`;
  }
  return next;
}
