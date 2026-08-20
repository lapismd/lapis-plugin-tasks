import { parser } from "@lezer/markdown";
import type { SyntaxNode } from "@lezer/common";
import type {
  AppDatabaseTaskRun,
  AppDatabaseTaskStructuralEntry,
  AppDatabaseTaskStructure,
  AppDatabaseTaskStructureDiagnostic,
  AppDatabaseTaskStructuralKind,
} from "@lapis-notes/api/app-database";

export type StructuralEntryKind = AppDatabaseTaskStructuralKind;
export type StructuralEntry = AppDatabaseTaskStructuralEntry;
export type IndexedTaskRun = AppDatabaseTaskRun;
export type TaskStructureDiagnostic = AppDatabaseTaskStructureDiagnostic;

export type TaskStructureTarget = {
  id: string;
  path: string;
  kind: "task" | "task-list" | "unsupported";
  title: string;
};

export type TaskStructureTargetResolver = (
  sourcePath: string,
  href: string,
) => TaskStructureTarget | null | Promise<TaskStructureTarget | null>;

export type HeadingContext = {
  path: string[];
  level: number | null;
  text: string | null;
  sourceStart: number | null;
  sourceEnd: number | null;
};

export type IndexedMarkdownHeading = HeadingContext & {
  sourceStart: number;
  sourceEnd: number;
};

export type StructuralEntryCandidate = {
  sourceDocumentId: string;
  sourceDocumentPath: string;
  authoredLabel: string;
  authoredHref: string;
  heading: HeadingContext;
  listDepth: number;
  listStart: number;
  positionInList: number;
  sourceStart: number;
  sourceEnd: number;
  source: string;
};

export type ScannedChecklistItem = {
  text: string;
  checked: boolean;
  position: number;
  sourceStart: number;
  sourceEnd: number;
  source: string;
};

export type ScannedTaskStructure = {
  candidates: StructuralEntryCandidate[];
  checklist: ScannedChecklistItem[];
};

export type TaskRun = IndexedTaskRun & {
  entries: StructuralEntry[];
  source: string;
};

export type ResolvedTaskDocumentStructure = Omit<
  AppDatabaseTaskStructure,
  "runs"
> & {
  documentId: string;
  documentPath: string;
  runs: TaskRun[];
};

function sourceBody(raw: string): { body: string; offset: number } {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match
    ? { body: raw.slice(match[0].length), offset: match[0].length }
    : { body: raw, offset: 0 };
}

function stableSourceHash(source: string): string {
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function headingLevel(node: SyntaxNode): number | null {
  const match = /^(?:ATX|Setext)Heading([1-6])$/.exec(node.name);
  return match ? Number(match[1]) : null;
}

function headingText(source: string, node: SyntaxNode): string {
  return source
    .slice(node.from, node.to)
    .replace(/^\s{0,3}#{1,6}\s*/, "")
    .replace(/\s+#+\s*$/, "")
    .replace(/^\s*/, "")
    .replace(/\s*(?:=+|-+)\s*$/, "")
    .trim();
}

function directChildren(node: SyntaxNode): SyntaxNode[] {
  const children: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    children.push(child);
  }
  return children;
}

export function scanTaskHeadings(raw: string): IndexedMarkdownHeading[] {
  const { body, offset } = sourceBody(raw);
  const tree = parser.parse(body);
  const active: Array<IndexedMarkdownHeading | undefined> = [];
  const headings: IndexedMarkdownHeading[] = [];
  for (let node = tree.topNode.firstChild; node; node = node.nextSibling) {
    const level = headingLevel(node);
    if (level == null || level === 1) continue;
    const text = headingText(body, node);
    active.length = level - 1;
    const heading: IndexedMarkdownHeading = {
      path: [
        ...(active.slice(0, level - 2).filter(Boolean) as IndexedMarkdownHeading[]).map(
          (entry) => entry.text!,
        ),
        text,
      ],
      level,
      text,
      sourceStart: node.from + offset,
      sourceEnd: node.to + offset,
    };
    active[level - 2] = heading;
    headings.push(heading);
  }
  return headings;
}

function standaloneLink(
  source: string,
  item: SyntaxNode,
): { label: string; href: string } | null {
  const children = directChildren(item);
  const paragraph = children.find((child) => child.name === "Paragraph");
  if (!paragraph || children.some((child) => child.name === "BulletList")) {
    return null;
  }
  const paragraphChildren = directChildren(paragraph);
  if (paragraphChildren.length !== 1 || paragraphChildren[0]?.name !== "Link") {
    return null;
  }
  const raw = source.slice(paragraph.from, paragraph.to).trim();
  const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(raw);
  if (!match) return null;
  const href = match[2]!.trim();
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/i.test(href)
  ) {
    return null;
  }
  return { label: match[1]!.trim(), href };
}

function checklistItem(
  source: string,
  item: SyntaxNode,
): { text: string; checked: boolean } | null {
  const paragraph = directChildren(item).find(
    (child) => child.name === "Paragraph",
  );
  if (!paragraph) return null;
  const raw = source.slice(paragraph.from, paragraph.to);
  const match = /^\[( |x|X)\]\s+([\s\S]+)$/.exec(raw);
  return match
    ? { text: match[2]!.trim(), checked: match[1] !== " " }
    : null;
}

function walkLists(
  source: string,
  bodyOffset: number,
  rootList: SyntaxNode,
  documentId: string,
  documentPath: string,
  heading: HeadingContext,
  includeChecklist: boolean,
  candidates: StructuralEntryCandidate[],
  checklist: ScannedChecklistItem[],
): void {
  const visitList = (list: SyntaxNode, depth: number) => {
    let positionInList = 0;
    for (const item of directChildren(list).filter(
      (node) => node.name === "ListItem",
    )) {
      const link = standaloneLink(source, item);
      if (link) {
        candidates.push({
          sourceDocumentId: documentId,
          sourceDocumentPath: documentPath,
          authoredLabel: link.label,
          authoredHref: link.href,
          heading: {
            ...heading,
            sourceStart:
              heading.sourceStart == null
                ? null
                : heading.sourceStart + bodyOffset,
            sourceEnd:
              heading.sourceEnd == null ? null : heading.sourceEnd + bodyOffset,
          },
          listDepth: depth,
          listStart: list.from + bodyOffset,
          positionInList,
          sourceStart: item.from + bodyOffset,
          sourceEnd: item.to + bodyOffset,
          source: source.slice(item.from, item.to),
        });
      } else if (includeChecklist) {
        const parsed = checklistItem(source, item);
        if (parsed) {
          checklist.push({
            ...parsed,
            position: checklist.length,
            sourceStart: item.from + bodyOffset,
            sourceEnd: item.to + bodyOffset,
            source: source.slice(item.from, item.to),
          });
        }
      }
      for (const child of directChildren(item)) {
        if (child.name === "BulletList") visitList(child, depth + 1);
      }
      positionInList += 1;
    }
  };

  visitList(rootList, 0);
}

export function scanTaskStructure(
  raw: string,
  options: {
    documentId: string;
    documentPath: string;
    documentKind: "task" | "task-list" | "task-list-navigation";
  },
): ScannedTaskStructure {
  const { body, offset } = sourceBody(raw);
  const tree = parser.parse(body);
  const candidates: StructuralEntryCandidate[] = [];
  const checklist: ScannedChecklistItem[] = [];
  const headings: Array<HeadingContext | undefined> = [];

  for (let node = tree.topNode.firstChild; node; node = node.nextSibling) {
    const level = headingLevel(node);
    if (level != null) {
      if (level === 1) continue;
      const text = headingText(body, node);
      headings.length = level - 1;
      headings[level - 2] = {
        path: [],
        level,
        text,
        sourceStart: node.from,
        sourceEnd: node.to,
      };
      continue;
    }
    if (node.name !== "BulletList") continue;
    const active = headings.filter(Boolean) as HeadingContext[];
    const owner = active.at(-1);
    const heading: HeadingContext = owner
      ? { ...owner, path: active.map((entry) => entry.text!).filter(Boolean) }
      : {
          path: [],
          level: null,
          text: null,
          sourceStart: null,
          sourceEnd: null,
        };
    walkLists(
      body,
      offset,
      node,
      options.documentId,
      options.documentPath,
      heading,
      options.documentKind === "task",
      candidates,
      checklist,
    );
  }

  return { candidates, checklist };
}

export async function resolveTaskDocumentStructure(
  raw: string,
  options: {
    documentId: string;
    documentPath: string;
    documentKind: "task" | "task-list";
  },
  resolveTarget: TaskStructureTargetResolver,
): Promise<ResolvedTaskDocumentStructure> {
  const scanned = scanTaskStructure(raw, options);
  const resolved: Array<{
    candidate: StructuralEntryCandidate;
    target: TaskStructureTarget;
    kind: StructuralEntryKind;
  }> = [];
  const diagnostics: TaskStructureDiagnostic[] = [];

  for (const candidate of scanned.candidates) {
    const target = await resolveTarget(
      candidate.sourceDocumentPath,
      candidate.authoredHref,
    );
    if (!target) {
      diagnostics.push({
        code: "unresolved-structural-link",
        message: `Could not resolve structural link ${candidate.authoredHref}.`,
        sourceStart: candidate.sourceStart,
        sourceEnd: candidate.sourceEnd,
        target: candidate.authoredHref,
      });
      continue;
    }
    if (target.kind !== "task" && target.kind !== "task-list") {
      diagnostics.push({
        code: "unsupported-structural-target",
        message: `${candidate.authoredHref} does not target a task or task-list.`,
        sourceStart: candidate.sourceStart,
        sourceEnd: candidate.sourceEnd,
        target: candidate.authoredHref,
      });
      continue;
    }
    resolved.push({
      candidate,
      target,
      kind: target.kind === "task" ? "task-entry" : "list-entry",
    });
  }

  const runs: TaskRun[] = [];
  let previousResolved: (typeof resolved)[number] | null = null;
  for (const item of resolved) {
    const previous = runs.at(-1);
    const contiguous =
      previous &&
      previousResolved &&
      previous.listDepth === item.candidate.listDepth &&
      previous.headingPath.join("\u0000") ===
        item.candidate.heading.path.join("\u0000") &&
      previousResolved.candidate.sourceEnd <= item.candidate.sourceStart &&
      item.candidate.positionInList ===
        previousResolved.candidate.positionInList + 1 &&
      previous.id.startsWith(
        `${options.documentId}:${item.candidate.listStart}:`,
      );
    if (!contiguous) {
      const id = `${options.documentId}:${item.candidate.listStart}:${item.candidate.positionInList}`;
      runs.push({
        id,
        documentId: options.documentId,
        documentPath: options.documentPath,
        headingPath: item.candidate.heading.path,
        headingLevel: item.candidate.heading.level,
        headingText: item.candidate.heading.text,
        listDepth: item.candidate.listDepth,
        startOffset: item.candidate.sourceStart,
        endOffset: item.candidate.sourceEnd,
        entryCount: 0,
        entries: [],
        source: "",
      });
    }
    const run = runs.at(-1)!;
    const entry: StructuralEntry = {
      sourceDocumentId: options.documentId,
      sourceDocumentPath: options.documentPath,
      targetDocumentId: item.target.id,
      targetDocumentPath: item.target.path,
      kind: item.kind,
      headingPath: item.candidate.heading.path,
      headingLevel: item.candidate.heading.level,
      headingText: item.candidate.heading.text,
      runId: run.id,
      positionInRun: run.entries.length,
      sourceStart: item.candidate.sourceStart,
      sourceEnd: item.candidate.sourceEnd,
      authoredLabel: item.candidate.authoredLabel,
      authoredHref: item.candidate.authoredHref,
    };
    run.entries.push(entry);
    run.endOffset = item.candidate.sourceEnd;
    run.entryCount = run.entries.length;
    run.source = raw.slice(run.startOffset, run.endOffset);
    previousResolved = item;
  }

  return {
    version: 1,
    documentId: options.documentId,
    documentPath: options.documentPath,
    sourceHash: stableSourceHash(raw),
    entries: runs.flatMap((run) => run.entries),
    runs,
    diagnostics,
  };
}

export function taskStructureForProjection(
  structure: ResolvedTaskDocumentStructure,
): AppDatabaseTaskStructure {
  return {
    version: structure.version,
    sourceHash: structure.sourceHash,
    entries: structure.entries,
    runs: structure.runs.map(({ entries: _entries, source: _source, ...run }) =>
      run,
    ),
    diagnostics: structure.diagnostics,
  };
}

function entryKey(entry: StructuralEntry): string {
  return `${entry.sourceDocumentPath}:${entry.sourceStart}:${entry.sourceEnd}`;
}

/**
 * Validates one complete, already-resolved vault snapshot. Invalid source links
 * remain Markdown, but their edges are removed from the active derived graph.
 */
export function validateTaskStructureGraph(
  structures: ReadonlyArray<ResolvedTaskDocumentStructure>,
): Map<string, ResolvedTaskDocumentStructure> {
  const invalid = new Map<
    string,
    "multiple-structural-parents" | "structural-cycle"
  >();
  const parents = new Map<string, Set<string>>();
  for (const structure of structures) {
    for (const entry of structure.entries) {
      const sources = parents.get(entry.targetDocumentId) ?? new Set<string>();
      sources.add(entry.sourceDocumentId);
      parents.set(entry.targetDocumentId, sources);
    }
  }
  for (const structure of structures) {
    for (const entry of structure.entries) {
      if ((parents.get(entry.targetDocumentId)?.size ?? 0) > 1) {
        invalid.set(entryKey(entry), "multiple-structural-parents");
      }
    }
  }

  const adjacency = new Map<string, Set<string>>();
  for (const structure of structures) {
    for (const entry of structure.entries) {
      if (invalid.has(entryKey(entry))) continue;
      const targets = adjacency.get(entry.sourceDocumentId) ?? new Set<string>();
      targets.add(entry.targetDocumentId);
      adjacency.set(entry.sourceDocumentId, targets);
    }
  }
  let nextIndex = 0;
  const indexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cyclicComponents: Set<string>[] = [];

  const connect = (node: string) => {
    indexes.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);
    for (const target of adjacency.get(node) ?? []) {
      if (!indexes.has(target)) {
        connect(target);
        lowLinks.set(
          node,
          Math.min(lowLinks.get(node)!, lowLinks.get(target)!),
        );
      } else if (onStack.has(target)) {
        lowLinks.set(
          node,
          Math.min(lowLinks.get(node)!, indexes.get(target)!),
        );
      }
    }
    if (lowLinks.get(node) !== indexes.get(node)) return;
    const component = new Set<string>();
    let member: string;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.add(member);
    } while (member !== node);
    if (
      component.size > 1 ||
      [...component].some((id) => adjacency.get(id)?.has(id))
    ) {
      cyclicComponents.push(component);
    }
  };

  for (const node of new Set([
    ...adjacency.keys(),
    ...[...adjacency.values()].flatMap((targets) => [...targets]),
  ])) {
    if (!indexes.has(node)) connect(node);
  }
  for (const structure of structures) {
    for (const entry of structure.entries) {
      if (
        cyclicComponents.some(
          (component) =>
            component.has(entry.sourceDocumentId) &&
            component.has(entry.targetDocumentId),
        )
      ) {
        invalid.set(entryKey(entry), "structural-cycle");
      }
    }
  }

  const validated = new Map<string, ResolvedTaskDocumentStructure>();
  for (const structure of structures) {
    const diagnostics = [...structure.diagnostics];
    const runs = structure.runs.flatMap((run) => {
      const entries = run.entries.filter((entry) => {
        const code = invalid.get(entryKey(entry));
        if (!code) return true;
        diagnostics.push({
          code,
          message:
            code === "structural-cycle"
              ? `${entry.authoredHref} participates in a structural cycle.`
              : `${entry.authoredHref} has more than one structural parent.`,
          sourceStart: entry.sourceStart,
          sourceEnd: entry.sourceEnd,
          target: entry.authoredHref,
        });
        return false;
      });
      return entries.length
        ? [{ ...run, entries, entryCount: entries.length }]
        : [];
    });
    validated.set(structure.documentPath, {
      ...structure,
      runs,
      entries: runs.flatMap((run) => run.entries),
      diagnostics,
    });
  }
  return validated;
}
