import { RRule, RRuleSet, type Options } from "rrule";

export type LocalDateString = `${number}-${number}-${number}`;

export type RecurrenceRuleAnalysis =
  | { status: "supported" }
  | { status: "unsupported"; parts: string[] }
  | { status: "invalid"; message: string };

export type RecurrenceEngineOptions = {
  start: LocalDateString;
  rrule: string;
  rdate?: LocalDateString[];
  exdate?: LocalDateString[];
};

const EXECUTABLE_KEYS = new Set([
  "FREQ",
  "INTERVAL",
  "BYDAY",
  "BYMONTHDAY",
  "BYMONTH",
  "BYSETPOS",
  "WKST",
  "COUNT",
  "UNTIL",
]);
const EXECUTABLE_FREQUENCIES = new Set([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;
const UNTIL_DATE_RE = /^\d{8}$/u;

function dateParts(value: string): [number, number, number] | null {
  if (!DATE_RE.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year!, month! - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return [year!, month!, day!];
}

export function isLocalDateString(value: unknown): value is LocalDateString {
  return typeof value === "string" && dateParts(value) !== null;
}

function toDate(value: LocalDateString): Date {
  const parts = dateParts(value);
  if (!parts) throw new Error(`Invalid local date: ${value}`);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

function fromDate(value: Date): LocalDateString {
  const year = String(value.getUTCFullYear()).padStart(4, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as LocalDateString;
}

function invalid(message: string): RecurrenceRuleAnalysis {
  return { status: "invalid", message };
}

function parseParts(rrule: string): Map<string, string> | RecurrenceRuleAnalysis {
  if (!rrule.trim() || rrule !== rrule.trim()) {
    return invalid("RRULE must be a non-empty trimmed property value.");
  }
  if (/\r|\n|^RRULE:/iu.test(rrule)) {
    return invalid("RRULE must store only the property value, without a prefix.");
  }
  const result = new Map<string, string>();
  for (const part of rrule.split(";")) {
    const match = /^([A-Z][A-Z0-9-]*)=([^=;]+)$/u.exec(part);
    if (!match) return invalid(`Invalid RRULE part: ${part}`);
    const key = match[1]!;
    if (result.has(key)) return invalid(`Duplicate RRULE property: ${key}`);
    result.set(key, match[2]!);
  }
  if (!result.has("FREQ")) return invalid("RRULE must include FREQ.");
  return result;
}

function isUntilCalendarDate(value: string): boolean {
  if (!UNTIL_DATE_RE.test(value)) return false;
  return isLocalDateString(
    `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
  );
}

/** Validate an RRULE and determine whether Tasks may execute every property. */
export function analyzeRecurrenceRule(rrule: string): RecurrenceRuleAnalysis {
  const parsed = parseParts(rrule);
  if (!(parsed instanceof Map)) return parsed;
  if (parsed.has("COUNT") && parsed.has("UNTIL")) {
    return invalid("RRULE must not combine COUNT and UNTIL.");
  }

  try {
    const options = RRule.parseString(rrule);
    new RRule({
      ...options,
      dtstart: new Date(Date.UTC(2000, 0, 1)),
    });
  } catch (error) {
    return invalid(error instanceof Error ? error.message : String(error));
  }

  const unsupported = [...parsed.keys()].filter(
    (key) => !EXECUTABLE_KEYS.has(key),
  );
  const frequency = parsed.get("FREQ")!;
  if (!EXECUTABLE_FREQUENCIES.has(frequency)) {
    unsupported.push(`FREQ=${frequency}`);
  }
  const until = parsed.get("UNTIL");
  if (until && !isUntilCalendarDate(until)) {
    unsupported.push("UNTIL with a time or zone");
  }
  return unsupported.length
    ? { status: "unsupported", parts: unsupported }
    : { status: "supported" };
}

export class UnsupportedRecurrenceRuleError extends Error {
  readonly code = "unsupported-recurrence-rule";

  constructor(readonly parts: string[]) {
    super(`Unsupported recurrence properties: ${parts.join(", ")}`);
    this.name = "UnsupportedRecurrenceRuleError";
  }
}

/** Date-only adapter over rrule.js and RRuleSet. */
export class RecurrenceEngine {
  private readonly set: RRuleSet;

  constructor(options: RecurrenceEngineOptions) {
    if (!isLocalDateString(options.start)) {
      throw new Error(`Invalid recurrence start: ${options.start}`);
    }
    const analysis = analyzeRecurrenceRule(options.rrule);
    if (analysis.status === "invalid") throw new Error(analysis.message);
    if (analysis.status === "unsupported") {
      throw new UnsupportedRecurrenceRuleError(analysis.parts);
    }
    const parsed = RRule.parseString(options.rrule) as Partial<Options>;
    const start = toDate(options.start);
    this.set = new RRuleSet();
    this.set.rrule(new RRule({ ...parsed, dtstart: start }));

    // rrule.js documents that a non-matching DTSTART is omitted. RFC 5545
    // treats DTSTART as the first recurrence instance, so compose it as RDATE.
    this.set.rdate(start);
    for (const date of options.rdate ?? []) this.set.rdate(toDate(date));
    for (const date of options.exdate ?? []) this.set.exdate(toDate(date));
  }

  next(
    after: LocalDateString,
    inclusive = false,
  ): LocalDateString | null {
    const result = this.set.after(toDate(after), inclusive);
    return result ? fromDate(result) : null;
  }

  previous(
    before: LocalDateString,
    inclusive = false,
  ): LocalDateString | null {
    const result = this.set.before(toDate(before), inclusive);
    return result ? fromDate(result) : null;
  }

  between(
    start: LocalDateString,
    end: LocalDateString,
    inclusive = true,
  ): LocalDateString[] {
    if (start > end) return [];
    return this.set
      .between(toDate(start), toDate(end), inclusive)
      .map(fromDate);
  }
}
