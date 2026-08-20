import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { scanTaskStructure } from "./task-structure";

export const TASK_DOCUMENT_SCHEMA = "tasks/v1";
export const TASK_PROJECTION_VERSION = 1;

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
export type TaskRepeatFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type TaskRepeatAnchor = "schedule" | "completion";
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
  strategy: "rolling";
  frequency: TaskRepeatFrequency;
  interval: number;
  on?: string[];
  anchor: TaskRepeatAnchor;
  resetChecklist?: boolean;
  lastCompletedAt?: string;
  completionCount?: number;
};

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
  completedAt?: string;
  inbox: boolean;
  start: TaskStart;
  plan?: TaskPlan;
  deadline?: string;
  repeat?: TaskRepeat;
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

export function parseDurationMinutes(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const match = DURATION_RE.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return undefined;
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = match[2] ? Number(match[2]) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : undefined;
}

export function formatDuration(minutes: number | undefined): string | undefined {
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
  const normalized = value
    ?.trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
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
    const markdownLink = line.match(/^\s*[-*]\s+(?:!\[[^\]]*\]\([^)]+\)|\[([^\]]+)\]\(([^)]+)\))\s*$/);
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
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
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
      message: "plan.at must be anytime, morning, afternoon, evening, or HH:mm.",
    });
  }
  const duration = asString(record.duration);
  const durationMinutes = parseDurationMinutes(duration);
  if (duration && durationMinutes == null) {
    diagnostics.push({
      code: "invalid-duration",
      field: "task.plan.duration",
      message: "plan.duration must be a positive duration such as 45m or 1h30m.",
    });
  }
  return { date, at, time, duration, durationMinutes };
}

function parseRepeat(
  value: unknown,
  diagnostics: TaskDiagnostic[],
): TaskRepeat | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const frequency = asString(record.frequency);
  const frequencies: TaskRepeatFrequency[] = ["daily", "weekly", "monthly", "yearly"];
  if (!frequency || !frequencies.includes(frequency as TaskRepeatFrequency)) {
    diagnostics.push({
      code: "invalid-repeat",
      field: "task.repeat.frequency",
      message: "repeat.frequency must be daily, weekly, monthly, or yearly.",
    });
    return undefined;
  }
  const interval =
    typeof record.interval === "number" && record.interval > 0
      ? record.interval
      : 1;
  const anchor = record.anchor === "completion" ? "completion" : "schedule";
  return {
    strategy: "rolling",
    frequency: frequency as TaskRepeatFrequency,
    interval,
    on: asStringArray(record.on),
    anchor,
    resetChecklist: record.resetChecklist === true,
    lastCompletedAt: asString(record.lastCompletedAt),
    completionCount:
      typeof record.completionCount === "number" ? record.completionCount : 0,
  };
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
  return {
    status,
    completedAt: asString(record.completedAt),
    inbox: record.inbox === true,
    start,
    plan,
    deadline: asString(record.deadline),
    repeat: parseRepeat(record.repeat, diagnostics),
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
  if (type !== "task" && type !== "task-list" && type !== "task-list-navigation") {
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
      ? frontMatterTitle ??
        firstHeading(body) ??
        formatTaskListIdTitle(id) ??
        titleFromPath(path)
      : firstHeading(body) ?? titleFromPath(path);
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
    checklist: structure.checklist.map(({ heading: _heading, ...item }) => item),
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
      inbox: document.task.inbox,
      start,
      ...(document.task.completedAt
        ? { completedAt: document.task.completedAt }
        : {}),
      ...(plan ? { plan } : {}),
      ...(document.task.deadline ? { deadline: document.task.deadline } : {}),
      ...(document.task.repeat ? { repeat: document.task.repeat } : {}),
      ...(document.task.comments.length
        ? { comments: document.task.comments }
        : {}),
    };
  }
  const yaml = stringifyYaml(common, { lineWidth: 0 }).trimEnd();
  const body = document.body.replace(/^\n+/, "");
  return `---\n${yaml}\n---\n${body.startsWith("\n") ? body : `\n${body}`}`;
}

export function resetChecklistItems(
  body: string,
  reset: boolean,
): string {
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
