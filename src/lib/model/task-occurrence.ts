import type {
  AppDatabaseTaskOccurrenceRecord,
  AppDatabaseTaskTracking,
  IndexProjectionRegistration,
} from "@lapis-notes/api/app-database";
import {
  TASK_OCCURRENCE_PROJECTION_FIELDS,
  TASK_OCCURRENCE_PROJECTION_VERSION,
} from "@lapis-notes/api/app-database";
import { parse as parseYaml } from "yaml";
import { formatDuration, parseDurationMinutes, type TaskTracking } from "./task-document";
import type { LocalDateString } from "./recurrence-engine";

export type TaskOccurrenceDayPart =
  | "anytime"
  | "morning"
  | "afternoon"
  | "evening";

export type TaskOccurrenceObservation = AppDatabaseTaskOccurrenceRecord & {
  checked: boolean;
  title: string;
  href: string;
  dayPart: TaskOccurrenceDayPart;
  source: string;
};

export type TaskOccurrenceMaterialization = {
  taskId: string;
  taskPath: string;
  title: string;
  occurrenceDate: LocalDateString;
  tracking?: TaskTracking;
  dayPart: TaskOccurrenceDayPart;
};

export type TaskOccurrenceCompletion =
  | { type: "boolean" }
  | { type: "count"; value: number; unit: string }
  | { type: "duration"; durationMinutes: number }
  | { type: "number"; value: number; unit: string };

const DAY_PART_LABELS: Record<TaskOccurrenceDayPart, string> = {
  anytime: "Anytime",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const OCCURRENCE_LINE_RE =
  /^(\s*)[-*+]\s+\[([ xX])\]\s+\[([^\]]+)\]\(([^)]+)\)(.*?)<!--\s*task-occurrence\s+([^>]*?)\s*-->\s*$/;

export class DuplicateTaskOccurrenceError extends Error {
  readonly code = "duplicate-task-occurrence";

  constructor(taskId: string, occurrenceDate: string) {
    super(`Daily note contains duplicate observations for ${taskId} on ${occurrenceDate}.`);
    this.name = "DuplicateTaskOccurrenceError";
  }
}

export class StaleTaskOccurrenceRangeError extends Error {
  readonly code = "stale-task-occurrence-range";

  constructor() {
    super("The daily task observation changed before it could be updated.");
    this.name = "StaleTaskOccurrenceRangeError";
  }
}

export class InvalidTaskOccurrenceValueError extends Error {
  readonly code = "invalid-task-occurrence-value";

  constructor(message: string) {
    super(message);
    this.name = "InvalidTaskOccurrenceValueError";
  }
}

function decodeMarkerValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function markerAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(/([a-z][a-zA-Z]*)=([^\s]+)/g)) {
    const value = decodeMarkerValue(match[2]);
    if (value !== undefined) attributes[match[1]!] = value;
  }
  return attributes;
}

function encodeMarkerValue(value: string): string {
  return encodeURIComponent(value);
}

function normalizeTrackingKind(value: string | undefined): TaskTracking["type"] | null {
  return value === "boolean" ||
    value === "count" ||
    value === "duration" ||
    value === "number"
    ? value
    : null;
}

function splitLinesWithOffsets(raw: string): Array<{
  text: string;
  start: number;
  end: number;
}> {
  const lines: Array<{ text: string; start: number; end: number }> = [];
  let start = 0;
  while (start < raw.length) {
    const newline = raw.indexOf("\n", start);
    const end = newline === -1 ? raw.length : newline + 1;
    const source = raw.slice(start, end);
    lines.push({ text: source.replace(/\r?\n$/, ""), start, end });
    start = end;
  }
  return lines;
}

function contextualRangeEnd(
  lines: Array<{ text: string; start: number; end: number }>,
  index: number,
): number {
  let end = lines[index]!.end;
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const line = lines[cursor]!;
    if (/^(?: {2,}|\t)\S?/.test(line.text)) {
      end = line.end;
      continue;
    }
    if (
      line.text.trim() === "" &&
      cursor + 1 < lines.length &&
      /^(?: {2,}|\t)\S?/.test(lines[cursor + 1]!.text)
    ) {
      end = line.end;
      continue;
    }
    break;
  }
  return end;
}

function parseValue(
  kind: TaskTracking["type"],
  suffix: string,
): { value?: number; unit?: string; durationMinutes?: number } {
  const valueSource = suffix.trim().replace(/^:\s*/, "");
  if (!valueSource || valueSource === suffix.trim()) return {};
  if (kind === "duration") {
    const durationMinutes = parseDurationMinutes(valueSource);
    return durationMinutes ? { durationMinutes } : {};
  }
  if (kind !== "count" && kind !== "number") return {};
  const match = /^(\d+(?:\.\d+)?)(?:\s+(.+))?$/.exec(valueSource);
  if (!match) return {};
  return {
    value: Number(match[1]),
    ...(match[2]?.trim() ? { unit: match[2].trim() } : {}),
  };
}

function dayPartFromHeading(value: string | undefined): TaskOccurrenceDayPart {
  const normalized = value?.trim().toLowerCase();
  return normalized === "morning" ||
    normalized === "afternoon" ||
    normalized === "evening"
    ? normalized
    : "anytime";
}

function resolveHref(sourcePath: string, href: string): string {
  let decoded = href;
  try {
    decoded = decodeURI(href);
  } catch {
    // Retain the authored href when it contains invalid escape sequences.
  }
  const target = decoded.replace(/^<|>$/g, "").split("#")[0] ?? decoded;
  if (target.startsWith("/")) return target.replace(/^\/+/, "");
  const parts = sourcePath.split("/");
  parts.pop();
  for (const segment of target.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

function relativeHref(sourcePath: string, targetPath: string): string {
  const sourceParts = sourcePath.split("/");
  sourceParts.pop();
  const targetParts = targetPath.split("/");
  while (sourceParts[0] && sourceParts[0] === targetParts[0]) {
    sourceParts.shift();
    targetParts.shift();
  }
  const relative = [
    ...sourceParts.map(() => ".."),
    ...targetParts,
  ].join("/");
  return encodeURI(relative || targetPath.split("/").at(-1) || targetPath);
}

function escapeLinkLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\r?\n/g, " ");
}

function trackingFor(input: TaskOccurrenceMaterialization): TaskTracking {
  return input.tracking ?? { type: "boolean" };
}

function markerFor(input: TaskOccurrenceMaterialization): string {
  const tracking = trackingFor(input);
  return [
    "<!-- task-occurrence",
    `task=${encodeMarkerValue(input.taskId)}`,
    `date=${input.occurrenceDate}`,
    `kind=${tracking.type}`,
    ...(tracking.type === "count" || tracking.type === "number"
      ? [`unit=${encodeMarkerValue(tracking.unit)}`]
      : []),
    "-->",
  ].join(" ");
}

function observationLine(input: TaskOccurrenceMaterialization): string {
  return `- [ ] [${escapeLinkLabel(input.title)}](${relativeHref("daily-placeholder/entry.md", input.taskPath)}) ${markerFor(input)}`;
}

function lineForDailyPath(
  dailyDocumentPath: string,
  input: TaskOccurrenceMaterialization,
): string {
  return observationLine(input).replace(
    /\]\([^)]+\)/,
    `](${relativeHref(dailyDocumentPath, input.taskPath)})`,
  );
}

export function isCanonicalDailyDocument(raw: string, date?: string): boolean {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return false;
  try {
    const value = parseYaml(match[1] ?? "") as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const frontMatter = value as Record<string, unknown>;
    return (
      frontMatter.type === "daily-note" &&
      typeof frontMatter.date === "string" &&
      (!date || frontMatter.date === date)
    );
  } catch {
    return false;
  }
}

export function scanTaskOccurrenceObservations(
  raw: string,
  dailyDocumentPath: string,
): TaskOccurrenceObservation[] {
  if (!isCanonicalDailyDocument(raw)) return [];
  const lines = splitLinesWithOffsets(raw);
  const observations: TaskOccurrenceObservation[] = [];
  let dayPart: TaskOccurrenceDayPart = "anytime";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const heading = /^###\s+(.+?)\s*$/.exec(line.text);
    if (heading) dayPart = dayPartFromHeading(heading[1]);
    const match = OCCURRENCE_LINE_RE.exec(line.text);
    if (!match) continue;
    const attributes = markerAttributes(match[6] ?? "");
    const taskId = attributes.task;
    const occurrenceDate = attributes.date;
    const trackingKind = normalizeTrackingKind(attributes.kind);
    if (!taskId || !/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate ?? "") || !trackingKind) {
      continue;
    }
    const sourceEnd = contextualRangeEnd(lines, index);
    const checked = match[2]!.toLowerCase() === "x";
    const parsedValue = parseValue(trackingKind, match[5] ?? "");
    const unit = parsedValue.unit ?? attributes.unit;
    observations.push({
      observationId: `${taskId}:${occurrenceDate}`,
      taskId,
      taskPath: resolveHref(dailyDocumentPath, match[4]!),
      dailyDocumentPath,
      occurrenceDate,
      outcome: checked ? "completed" : "pending",
      trackingKind,
      ...(parsedValue.value !== undefined ? { value: parsedValue.value } : {}),
      ...(unit ? { unit } : {}),
      ...(parsedValue.durationMinutes !== undefined
        ? { durationMinutes: parsedValue.durationMinutes }
        : {}),
      sourceStart: line.start,
      sourceEnd,
      projectionVersion: TASK_OCCURRENCE_PROJECTION_VERSION,
      checked,
      title: match[3]!,
      href: match[4]!,
      dayPart,
      source: raw.slice(line.start, sourceEnd),
    });
  }
  return observations;
}

function requireUniqueObservation(
  observations: TaskOccurrenceObservation[],
  taskId: string,
  occurrenceDate: string,
): TaskOccurrenceObservation | null {
  const matches = observations.filter(
    (observation) =>
      observation.taskId === taskId &&
      observation.occurrenceDate === occurrenceDate,
  );
  if (matches.length > 1) throw new DuplicateTaskOccurrenceError(taskId, occurrenceDate);
  return matches[0] ?? null;
}

function appendBlock(raw: string, block: string): string {
  const base = raw.replace(/\s*$/, "");
  return `${base}${base ? "\n\n" : ""}${block.replace(/^\n+|\n+$/g, "")}\n`;
}

export function materializeTaskOccurrence(
  raw: string,
  dailyDocumentPath: string,
  input: TaskOccurrenceMaterialization,
): string {
  if (!isCanonicalDailyDocument(raw, input.occurrenceDate)) {
    throw new Error(`Expected ${dailyDocumentPath} to be the canonical daily note for ${input.occurrenceDate}.`);
  }
  const existing = requireUniqueObservation(
    scanTaskOccurrenceObservations(raw, dailyDocumentPath),
    input.taskId,
    input.occurrenceDate,
  );
  if (existing) return raw;

  const line = lineForDailyPath(dailyDocumentPath, input);
  const label = DAY_PART_LABELS[input.dayPart];
  const lines = splitLinesWithOffsets(raw);
  const tasksIndex = lines.findIndex((entry) => /^##\s+Tasks\s*$/.test(entry.text));
  if (tasksIndex === -1) return appendBlock(raw, `## Tasks\n\n### ${label}\n\n${line}`);

  const tasksEndIndex = lines.findIndex(
    (entry, index) => index > tasksIndex && /^##\s+/.test(entry.text),
  );
  const tasksEnd = tasksEndIndex === -1 ? raw.length : lines[tasksEndIndex]!.start;
  const sectionIndex = lines.findIndex(
    (entry, index) =>
      index > tasksIndex &&
      (tasksEndIndex === -1 || index < tasksEndIndex) &&
      new RegExp(`^###\\s+${label}\\s*$`, "i").test(entry.text),
  );
  if (sectionIndex === -1) {
    const before = raw.slice(0, tasksEnd).replace(/\s*$/, "");
    const after = raw.slice(tasksEnd).replace(/^\s*/, "");
    return `${before}\n\n### ${label}\n\n${line}\n${after ? `\n${after}` : ""}`;
  }

  const sectionEndIndex = lines.findIndex(
    (entry, index) =>
      index > sectionIndex &&
      (tasksEndIndex === -1 || index <= tasksEndIndex) &&
      /^#{2,3}\s+/.test(entry.text),
  );
  const sectionEnd = sectionEndIndex === -1 ? tasksEnd : lines[sectionEndIndex]!.start;
  const before = raw.slice(0, sectionEnd).replace(/\s*$/, "");
  const after = raw.slice(sectionEnd).replace(/^\s*/, "");
  return `${before}\n\n${line}\n${after ? `\n${after}` : ""}`;
}

function validatedCompletion(
  observation: TaskOccurrenceObservation,
  completion: TaskOccurrenceCompletion,
): string {
  if (completion.type !== observation.trackingKind) {
    throw new InvalidTaskOccurrenceValueError(
      `Expected ${observation.trackingKind} tracking data.`,
    );
  }
  if (completion.type === "boolean") return "";
  if (completion.type === "duration") {
    if (!Number.isInteger(completion.durationMinutes) || completion.durationMinutes <= 0) {
      throw new InvalidTaskOccurrenceValueError("Duration must be at least one minute.");
    }
    return ` : ${formatDuration(completion.durationMinutes)}`;
  }
  if (!Number.isFinite(completion.value) || completion.value < 0) {
    throw new InvalidTaskOccurrenceValueError("Tracked value must be zero or greater.");
  }
  if (completion.type === "count" && !Number.isInteger(completion.value)) {
    throw new InvalidTaskOccurrenceValueError("Count must be a whole number.");
  }
  if (!completion.unit.trim()) {
    throw new InvalidTaskOccurrenceValueError("Tracked value requires a unit.");
  }
  return ` : ${completion.value} ${completion.unit.trim()}`;
}

export function completeTaskOccurrence(
  raw: string,
  dailyDocumentPath: string,
  expected: TaskOccurrenceObservation,
  completion: TaskOccurrenceCompletion,
): string {
  if (
    raw.slice(expected.sourceStart, expected.sourceEnd) !== expected.source ||
    expected.dailyDocumentPath !== dailyDocumentPath
  ) {
    throw new StaleTaskOccurrenceRangeError();
  }
  const observations = scanTaskOccurrenceObservations(raw, dailyDocumentPath);
  const current = requireUniqueObservation(
    observations,
    expected.taskId,
    expected.occurrenceDate,
  );
  if (!current || current.sourceStart !== expected.sourceStart) {
    throw new StaleTaskOccurrenceRangeError();
  }
  const suffix = validatedCompletion(current, completion);
  const firstLineEnd = current.source.indexOf("\n");
  const firstLine = firstLineEnd === -1 ? current.source : current.source.slice(0, firstLineEnd);
  const context = firstLineEnd === -1 ? "" : current.source.slice(firstLineEnd);
  const markerIndex = firstLine.indexOf("<!-- task-occurrence");
  if (markerIndex === -1) throw new StaleTaskOccurrenceRangeError();
  const prefix = firstLine
    .slice(0, markerIndex)
    .replace(/^(\s*[-*+]\s+\[)[ xX](\]\s+\[[\s\S]*)$/, `$1x$2`)
    .replace(/\s*(?::\s*.*?)?\s*$/, "");
  const nextSource = `${prefix}${suffix} ${firstLine.slice(markerIndex)}${context}`;
  if (nextSource === current.source) return raw;
  return `${raw.slice(0, current.sourceStart)}${nextSource}${raw.slice(current.sourceEnd)}`;
}

export function taskOccurrenceProjectionRows(
  raw: string,
  dailyDocumentPath: string,
): AppDatabaseTaskOccurrenceRecord[] {
  return scanTaskOccurrenceObservations(raw, dailyDocumentPath).map(
    ({ checked: _checked, title: _title, href: _href, dayPart: _dayPart, source: _source, ...row }) => row,
  );
}

export function createTaskOccurrencesProjectionRegistration(): IndexProjectionRegistration {
  return {
    id: "occurrence",
    version: TASK_OCCURRENCE_PROJECTION_VERSION,
    visibility: "public",
    fields: TASK_OCCURRENCE_PROJECTION_FIELDS,
    source: { extensions: ["md", "markdown"] },
    project({ file, content }) {
      return {
        rows: taskOccurrenceProjectionRows(content, file.path).map((row, ordinal) => ({
          id: row.observationId,
          kind: "observation",
          ordinal,
          data: row as unknown as Record<string, unknown>,
        })),
      };
    },
  };
}

export function trackingCompletion(
  tracking: AppDatabaseTaskTracking | TaskTracking | undefined,
  value?: number,
): TaskOccurrenceCompletion {
  if (!tracking || tracking.type === "boolean") return { type: "boolean" };
  if (tracking.type === "duration") {
    if (value === undefined) {
      throw new InvalidTaskOccurrenceValueError("Duration completion requires minutes.");
    }
    return { type: "duration", durationMinutes: value };
  }
  if (value === undefined) {
    throw new InvalidTaskOccurrenceValueError(`${tracking.type === "count" ? "Count" : "Number"} completion requires a value.`);
  }
  return { type: tracking.type, value, unit: tracking.unit };
}
