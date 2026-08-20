import { parseTaskDocument } from "./task-document";

export type TaskListItemsEntry = {
  label: string;
  target: string;
  from: number;
  to: number;
  source: string;
};

export type TaskListItemsSection = {
  ordinal: number;
  from: number;
  to: number;
  contentFrom: number;
  contentTo: number;
  source: string;
  entries: TaskListItemsEntry[];
};

export class TaskListItemsMutationError extends Error {
  constructor(
    readonly code: "stale-section" | "missing-section" | "invalid-document",
    message: string,
  ) {
    super(message);
    this.name = "TaskListItemsMutationError";
  }
}

type SourceLine = { from: number; to: number; text: string };

function sourceLines(source: string): SourceLine[] {
  const lines: SourceLine[] = [];
  let from = 0;
  for (const match of source.matchAll(/.*(?:\r\n|\n|$)/g)) {
    const value = match[0];
    if (!value) continue;
    const to = from + value.length;
    lines.push({ from, to, text: value.replace(/\r?\n$/, "") });
    from = to;
  }
  return lines;
}

function parseEntry(line: SourceLine): TaskListItemsEntry | null {
  const match = /^[-*+]\s+\[([^\]]+)\]\(([^)]+)\)\s*$/.exec(line.text);
  if (!match) return null;
  return {
    label: match[1]!.trim(),
    target: match[2]!.trim(),
    from: line.from,
    to: line.to,
    source: line.text,
  };
}

/**
 * Finds fail-closed canonical Items sections without changing their source.
 * A section containing anything except whitespace and top-level Markdown
 * links remains ordinary Markdown.
 */
export function scanTaskListItemsSections(
  source: string,
  sourcePath = "task-list.md",
): TaskListItemsSection[] {
  const parsed = parseTaskDocument(source, sourcePath);
  if (!parsed || parsed.kind !== "task-list") return [];

  const lines = sourceLines(source);
  const sections: TaskListItemsSection[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index]!;
    if (!/^##\s+Items\s*$/.test(heading.text)) continue;

    let endIndex = index + 1;
    while (
      endIndex < lines.length &&
      !/^#{1,2}(?:\s+|$)/.test(lines[endIndex]!.text)
    ) {
      endIndex += 1;
    }
    const content = lines.slice(index + 1, endIndex);
    const entries: TaskListItemsEntry[] = [];
    let supported = true;
    for (const line of content) {
      if (!line.text.trim()) continue;
      const entry = parseEntry(line);
      if (!entry) {
        supported = false;
        break;
      }
      entries.push(entry);
    }
    if (!supported) continue;

    const to = endIndex < lines.length ? lines[endIndex]!.from : source.length;
    const contentFrom = heading.to;
    sections.push({
      ordinal: sections.length,
      from: heading.from,
      to,
      contentFrom,
      contentTo: to,
      source: source.slice(heading.from, to),
      entries,
    });
    index = endIndex - 1;
  }
  return sections;
}

export function replaceTaskListItemsSection(
  source: string,
  expected: Pick<TaskListItemsSection, "ordinal" | "source">,
  entries: ReadonlyArray<{ label: string; target: string }>,
  sourcePath = "task-list.md",
): string {
  const sections = scanTaskListItemsSections(source, sourcePath);
  const section = sections[expected.ordinal];
  if (!section) {
    throw new TaskListItemsMutationError(
      "missing-section",
      `Items section ${expected.ordinal + 1} no longer exists.`,
    );
  }
  if (section.source !== expected.source) {
    throw new TaskListItemsMutationError(
      "stale-section",
      "The Items section changed before this edit could be saved.",
    );
  }

  const newline = section.source.includes("\r\n") ? "\r\n" : "\n";
  const headingEnd = section.source.indexOf(newline);
  const heading =
    headingEnd === -1 ? section.source : section.source.slice(0, headingEnd);
  const trailingFrom = section.entries.length
    ? section.entries[section.entries.length - 1]!.to - section.from
    : headingEnd === -1
      ? section.source.length
      : headingEnd + newline.length;
  const trailing = section.source.slice(trailingFrom);
  const body = entries
    .map(({ label, target }) => `- [${label}](${target})`)
    .join(newline);
  const replacement = `${heading}${newline}${body}${body ? newline : ""}${trailing}`;
  const next = `${source.slice(0, section.from)}${replacement}${source.slice(section.to)}`;
  const reparsed = parseTaskDocument(next, sourcePath);
  if (!reparsed || reparsed.kind !== "task-list") {
    throw new TaskListItemsMutationError(
      "invalid-document",
      "Items edit produced an invalid task-list document.",
    );
  }
  return next;
}
