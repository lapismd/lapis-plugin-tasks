import { parseTaskDocument } from "./task-document";
import {
  scanTaskHeadings,
  scanTaskStructure,
  type IndexedMarkdownHeading,
  type StructuralEntryKind,
  type TaskStructureTarget,
} from "./task-structure";

export const TASK_MARKDOWN_GROUP_TONES = [
  "anytime",
  "morning",
  "afternoon",
  "evening",
  "done",
] as const;

export type TaskMarkdownGroupTone =
  (typeof TASK_MARKDOWN_GROUP_TONES)[number];

export type TaskMarkdownGroupHeading = IndexedMarkdownHeading & {
  ordinal: number;
  tone: TaskMarkdownGroupTone;
};

export type StructuralTaskRunEntry = {
  label: string;
  target: string;
  kind: StructuralEntryKind;
  targetId: string;
  targetPath: string;
  from: number;
  to: number;
  source: string;
};

export type StructuralTaskRunEntryInput = Pick<
  StructuralTaskRunEntry,
  "label" | "target"
> &
  Partial<Pick<StructuralTaskRunEntry, "source">>;

export type StructuralTaskRun = {
  id: string;
  ordinal: number;
  documentId: string;
  documentPath: string;
  headingPath: string[];
  headingLevel: number | null;
  headingText: string | null;
  headingFrom: number | null;
  headingTo: number | null;
  listDepth: number;
  from: number;
  to: number;
  source: string;
  entries: StructuralTaskRunEntry[];
};

export type StructuralTaskRunEditorChange = {
  from: number;
  to: number;
  insert: string;
};

export class TaskHeadingMutationError extends Error {
  constructor(
    readonly code: "missing-heading" | "stale-heading" | "invalid-heading",
    message: string,
  ) {
    super(message);
    this.name = "TaskHeadingMutationError";
  }
}

export type StructuralTaskTargetResolver = (
  sourcePath: string,
  href: string,
) => TaskStructureTarget | null;

export class StructuralTaskRunMutationError extends Error {
  constructor(
    readonly code: "stale-run" | "missing-run" | "invalid-document",
    message: string,
  ) {
    super(message);
    this.name = "StructuralTaskRunMutationError";
  }
}

/** Finds contiguous structural Task/List runs without consuming headings. */
export function scanStructuralTaskRuns(
  source: string,
  sourcePath: string,
  resolveTarget: StructuralTaskTargetResolver,
): StructuralTaskRun[] {
  const parsed = parseTaskDocument(source, sourcePath);
  if (!parsed || (parsed.kind !== "task" && parsed.kind !== "task-list")) {
    return [];
  }
  return scanResolvedTaskRuns(
    source,
    parsed.id,
    parsed.path,
    parsed.kind,
    resolveTarget,
    () => true,
  );
}

/**
 * Finds rich Markdown presentation runs. Navigation runs stay presentation-only
 * and include only links whose targets are Task Lists.
 */
export function scanMarkdownTaskRuns(
  source: string,
  sourcePath: string,
  resolveTarget: StructuralTaskTargetResolver,
): StructuralTaskRun[] {
  const parsed = parseTaskDocument(source, sourcePath);
  if (!parsed) return [];
  if (parsed.kind === "task" || parsed.kind === "task-list") {
    return scanStructuralTaskRuns(source, sourcePath, resolveTarget);
  }
  return scanResolvedTaskRuns(
    source,
    parsed.id,
    parsed.path,
    parsed.kind,
    resolveTarget,
    (target) => target.kind === "task-list",
  );
}

/**
 * Finds semantic Markdown headings that own rich Tasks presentation. The
 * returned tone is disposable UI state derived solely from source order.
 */
export function scanMarkdownTaskGroupHeadings(
  source: string,
  sourcePath: string,
  resolveTarget: StructuralTaskTargetResolver,
): TaskMarkdownGroupHeading[] {
  const parsed = parseTaskDocument(source, sourcePath);
  if (!parsed) return [];

  const ownedHeadingStarts = new Set<number>();
  for (const run of scanMarkdownTaskRuns(source, sourcePath, resolveTarget)) {
    if (run.headingFrom != null) ownedHeadingStarts.add(run.headingFrom);
  }
  if (parsed.kind === "task") {
    const scanned = scanTaskStructure(source, {
      documentId: parsed.id,
      documentPath: parsed.path,
      documentKind: "task",
    });
    for (const item of scanned.checklist) {
      if (item.heading.sourceStart != null) {
        ownedHeadingStarts.add(item.heading.sourceStart);
      }
    }
  }

  return scanTaskHeadings(source)
    .filter((heading) => ownedHeadingStarts.has(heading.sourceStart))
    .map((heading, ordinal) => ({
      ...heading,
      ordinal,
      tone:
        TASK_MARKDOWN_GROUP_TONES[
          ordinal % TASK_MARKDOWN_GROUP_TONES.length
        ]!,
    }));
}

function scanResolvedTaskRuns(
  source: string,
  documentId: string,
  documentPath: string,
  documentKind: "task" | "task-list" | "task-list-navigation",
  resolveTarget: StructuralTaskTargetResolver,
  includeTarget: (target: TaskStructureTarget) => boolean,
): StructuralTaskRun[] {
  const scanned = scanTaskStructure(source, {
    documentId,
    documentPath,
    documentKind,
  });
  const resolved = scanned.candidates.map((candidate) => {
    const target = resolveTarget(documentPath, candidate.authoredHref);
    return target && target.kind !== "unsupported" && includeTarget(target)
      ? {
          candidate,
          target,
          kind: (target.kind === "task"
            ? "task-entry"
            : "list-entry") as StructuralEntryKind,
        }
      : null;
  });

  const runs: StructuralTaskRun[] = [];
  let previous: NonNullable<(typeof resolved)[number]> | null = null;
  for (const item of resolved) {
    if (!item) {
      previous = null;
      continue;
    }
    const current = runs.at(-1);
    const contiguous =
      current &&
      previous &&
      current.listDepth === item.candidate.listDepth &&
      current.headingPath.join("\u0000") ===
        item.candidate.heading.path.join("\u0000") &&
      current.id.startsWith(`${documentId}:${item.candidate.listStart}:`) &&
      item.candidate.positionInList === previous.candidate.positionInList + 1;
    if (!contiguous) {
      runs.push({
        id: `${documentId}:${item.candidate.listStart}:${item.candidate.positionInList}`,
        ordinal: runs.length,
        documentId,
        documentPath,
        headingPath: item.candidate.heading.path,
        headingLevel: item.candidate.heading.level,
        headingText: item.candidate.heading.text,
        headingFrom: item.candidate.heading.sourceStart,
        headingTo: item.candidate.heading.sourceEnd,
        listDepth: item.candidate.listDepth,
        from: item.candidate.sourceStart,
        to: item.candidate.sourceEnd,
        source: item.candidate.source,
        entries: [],
      });
    }
    const run = runs.at(-1)!;
    run.entries.push({
      label: item.candidate.authoredLabel,
      target: item.candidate.authoredHref,
      kind: item.kind,
      targetId: item.target.id,
      targetPath: item.target.path,
      from: item.candidate.sourceStart,
      to: item.candidate.sourceEnd,
      source: item.candidate.source,
    });
    run.to = item.candidate.sourceEnd;
    run.source = source.slice(run.from, run.to);
    previous = item;
  }
  return runs;
}

export function structuralTaskRunDecorationRange(
  run: StructuralTaskRun,
): { from: number; to: number } {
  return { from: run.from, to: run.to };
}

function escapeLabel(label: string): string {
  return label.replace(/([\\\]])/g, "\\$1");
}

function escapeTarget(target: string): string {
  return target.replace(/([\\)])/g, "\\$1");
}

function replacementSource(
  run: StructuralTaskRun,
  entries: ReadonlyArray<StructuralTaskRunEntryInput>,
): string {
  const newline = run.source.includes("\r\n") ? "\r\n" : "\n";
  const first = run.entries[0]?.source ?? "- [Task](task.md)";
  const prefix = /^(\s*[-*+]\s+)/.exec(first)?.[1] ?? "- ";
  const available = new Map<string, string[]>();
  for (const entry of run.entries) {
    const key = `${entry.label}\u0000${entry.target}`;
    available.set(key, [...(available.get(key) ?? []), entry.source]);
  }
  return entries
    .map((entry) => {
      if (entry.source) return entry.source;
      const key = `${entry.label}\u0000${entry.target}`;
      const retained = available.get(key)?.shift();
      return (
        retained ??
        `${prefix}[${escapeLabel(entry.label)}](${escapeTarget(entry.target)})`
      );
    })
    .join(newline);
}

export function replaceStructuralTaskRun(
  source: string,
  expected: StructuralTaskRun,
  entries: ReadonlyArray<StructuralTaskRunEntryInput>,
  sourcePath: string,
): string {
  if (expected.from < 0 || expected.to > source.length) {
    throw new StructuralTaskRunMutationError(
      "missing-run",
      "The task run no longer exists.",
    );
  }
  if (source.slice(expected.from, expected.to) !== expected.source) {
    throw new StructuralTaskRunMutationError(
      "stale-run",
      "The task run changed before this edit could be saved.",
    );
  }
  const insert = replacementSource(expected, entries);
  const next = `${source.slice(0, expected.from)}${insert}${source.slice(expected.to)}`;
  const reparsed = parseTaskDocument(next, sourcePath);
  if (!reparsed || !["task", "task-list"].includes(reparsed.kind)) {
    throw new StructuralTaskRunMutationError(
      "invalid-document",
      "Task run edit produced an invalid task document.",
    );
  }
  return next;
}

export function structuralTaskRunEditorChange(
  source: string,
  run: StructuralTaskRun,
  entries: ReadonlyArray<StructuralTaskRunEntryInput>,
  sourcePath: string,
): StructuralTaskRunEditorChange {
  const next = replaceStructuralTaskRun(
    source,
    run,
    entries,
    sourcePath,
  );
  const suffixLength = source.length - run.to;
  return {
    from: run.from,
    to: run.to,
    insert: next.slice(run.from, suffixLength ? -suffixLength : undefined),
  };
}

export function renameTaskHeading(
  source: string,
  headingPath: readonly string[],
  nextText: string,
): string {
  const title = nextText.trim();
  if (!title || /[\r\n]/.test(title)) {
    throw new TaskHeadingMutationError(
      "invalid-heading",
      "A task grouping heading needs one non-empty line of text.",
    );
  }
  const heading = scanTaskHeadings(source).find(
    (candidate) =>
      candidate.path.join("\u0000") === headingPath.join("\u0000"),
  );
  if (!heading) {
    throw new TaskHeadingMutationError(
      "missing-heading",
      `Could not find heading ${headingPath.join(" / ")}.`,
    );
  }
  const current = source.slice(heading.sourceStart, heading.sourceEnd);
  const replacement = current.replace(
    /^(\s{0,3}#{2,6}\s+)(.*?)(\s+#+\s*)?$/,
    (_match, prefix: string, _text: string, suffix = "") =>
      `${prefix}${title}${suffix}`,
  );
  if (replacement === current && heading.text !== title) {
    throw new TaskHeadingMutationError(
      "stale-heading",
      "The heading changed before it could be renamed.",
    );
  }
  return `${source.slice(0, heading.sourceStart)}${replacement}${source.slice(heading.sourceEnd)}`;
}

export function createTaskHeading(
  source: string,
  text: string,
  level = 2,
): string {
  const title = text.trim();
  if (!title || /[\r\n]/.test(title) || level < 2 || level > 6) {
    throw new TaskHeadingMutationError(
      "invalid-heading",
      "A task grouping heading needs a level from 2 to 6 and one line of text.",
    );
  }
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const trimmed = source.replace(/(?:\r?\n)*$/, "");
  return `${trimmed}${trimmed ? `${newline}${newline}` : ""}${"#".repeat(level)} ${title}${newline}`;
}

export function addStructuralEntryUnderHeading(
  source: string,
  headingPath: readonly string[],
  entry: StructuralTaskRunEntryInput,
): string {
  const headings = scanTaskHeadings(source);
  const heading = headingPath.length
    ? headings.find(
        (candidate) =>
          candidate.path.join("\u0000") === headingPath.join("\u0000"),
      )
    : null;
  if (headingPath.length && !heading) {
    throw new TaskHeadingMutationError(
      "missing-heading",
      `Could not find heading ${headingPath.join(" / ")}.`,
    );
  }
  const nextHeading = headings.find(
    (candidate) =>
      candidate.sourceStart > (heading?.sourceStart ?? -1) &&
      candidate.level! <= (heading?.level ?? 1),
  );
  const to = nextHeading?.sourceStart ?? source.length;
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const before = source.slice(0, to).replace(/(?:\r?\n)*$/, "");
  const after = source.slice(to);
  const item = `- [${escapeLabel(entry.label)}](${escapeTarget(entry.target)})`;
  return `${before}${newline}${newline}${item}${newline}${after}`;
}

export function moveStructuralTaskEntryEditorChanges(
  source: string,
  sourceRun: StructuralTaskRun,
  sourceIndex: number,
  targetRun: StructuralTaskRun,
  targetIndex: number,
): StructuralTaskRunEditorChange[] {
  if (
    source.slice(sourceRun.from, sourceRun.to) !== sourceRun.source ||
    source.slice(targetRun.from, targetRun.to) !== targetRun.source
  ) {
    throw new StructuralTaskRunMutationError(
      "stale-run",
      "A task run changed before the structural move could be saved.",
    );
  }
  const moving = sourceRun.entries[sourceIndex];
  if (!moving) {
    throw new StructuralTaskRunMutationError(
      "missing-run",
      "The structural entry no longer exists.",
    );
  }
  if (sourceRun.id === targetRun.id) {
    const entries = [...sourceRun.entries];
    entries.splice(sourceIndex, 1);
    entries.splice(Math.max(0, Math.min(targetIndex, entries.length)), 0, moving);
    return [
      structuralTaskRunEditorChange(
        source,
        sourceRun,
        entries,
        sourceRun.documentPath,
      ),
    ];
  }

  return [
    removeStructuralTaskEntryEditorChange(source, sourceRun, sourceIndex),
    insertStructuralTaskEntryEditorChange(
      source,
      targetRun,
      targetIndex,
      moving,
    ),
  ].sort((left, right) => left.from - right.from);
}

export function removeStructuralTaskEntryEditorChange(
  source: string,
  run: StructuralTaskRun,
  index: number,
): StructuralTaskRunEditorChange {
  if (source.slice(run.from, run.to) !== run.source) {
    throw new StructuralTaskRunMutationError(
      "stale-run",
      "The task run changed before its entry could be removed.",
    );
  }
  const moving = run.entries[index];
  if (!moving) {
    throw new StructuralTaskRunMutationError(
      "missing-run",
      "The structural entry no longer exists.",
    );
  }
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  let removeFrom = moving.from;
  let removeTo = moving.to;
  if (source.slice(removeTo).startsWith(newline)) removeTo += newline.length;
  else if (source.slice(0, removeFrom).endsWith(newline)) {
    removeFrom -= newline.length;
  }
  return { from: removeFrom, to: removeTo, insert: "" };
}

export function insertStructuralTaskEntryEditorChange(
  source: string,
  run: StructuralTaskRun,
  index: number,
  entry: StructuralTaskRunEntryInput,
): StructuralTaskRunEditorChange {
  if (source.slice(run.from, run.to) !== run.source) {
    throw new StructuralTaskRunMutationError(
      "stale-run",
      "The task run changed before its entry could be inserted.",
    );
  }
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const insertLine = replacementSource(run, [
    { label: entry.label, target: entry.target },
  ]);
  const before = run.entries[index];
  const insertAt = before?.from ?? run.to;
  const insert = before ? `${insertLine}${newline}` : `${newline}${insertLine}`;
  return { from: insertAt, to: insertAt, insert };
}
