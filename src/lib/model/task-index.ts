import type {
  AppDatabase,
  AppDatabaseIndexedFile,
  AppDatabaseLinkRecord,
  IndexProjectionEdgeInput,
  IndexProjectionRegistration,
} from "@lapis-notes/api/app-database";
import type { App } from "@lapis-notes/api";
import {
  PUBLIC_TASKS_PROJECTION_ID,
  TASK_PROJECTION_FIELDS,
  TASK_PROJECTION_VERSION,
} from "@lapis-notes/api/app-database";
import { parseTaskDocument, type ParsedTaskFile } from "./task-document";
import { projectTask } from "./task-projection";
import { todayDateOnly } from "./task-dates";
import {
  resolveTaskDocumentStructure,
  taskStructureForProjection,
  type ResolvedTaskDocumentStructure,
  type TaskStructureTargetResolver,
} from "./task-structure";

const unresolvedTarget: TaskStructureTargetResolver = () => null;

export function createAppTaskStructureResolver(
  app: App,
): TaskStructureTargetResolver {
  return async (sourcePath, href) => {
    const target = app.metadataCache.getFirstLinkpathDest(href, sourcePath);
    if (!target) return null;
    const raw = await app.vault.cachedRead(target);
    const document = parseTaskDocument(raw, target.path);
    if (!document || document.kind === "task-list-navigation") {
      return {
        id: target.path,
        path: target.path,
        kind: "unsupported",
        title: target.basename,
      };
    }
    return {
      id: document.id,
      path: document.path,
      kind: document.kind,
      title: document.title,
    };
  };
}

export function createTaskStructureResolverFromDocuments(
  documents: Iterable<ParsedTaskFile>,
): TaskStructureTargetResolver {
  const byPath = new Map(
    [...documents]
      .filter((document) => document.kind !== "task-list-navigation")
      .map((document) => [document.path, document]),
  );
  return (sourcePath, href) => {
    const target = byPath.get(resolveTaskHref(sourcePath, href));
    if (!target) return null;
    return {
      id: target.id,
      path: target.path,
      kind: target.kind,
      title: target.title,
    };
  };
}

async function resolvedStructure(
  document: ParsedTaskFile,
  resolveTarget: TaskStructureTargetResolver,
): Promise<ResolvedTaskDocumentStructure | null> {
  if (document.kind === "task-list-navigation") return null;
  return resolveTaskDocumentStructure(
    document.raw,
    {
      documentId: document.id,
      documentPath: document.path,
      documentKind: document.kind,
    },
    resolveTarget,
  );
}

export function createTasksProjectionRegistration(
  resolveTarget: TaskStructureTargetResolver = unresolvedTarget,
  currentDate: () => string = () => todayDateOnly(),
): IndexProjectionRegistration {
  return {
    id: "task",
    version: TASK_PROJECTION_VERSION,
    visibility: "public",
    fields: TASK_PROJECTION_FIELDS,
    source: {
      extensions: ["md", "markdown"],
    },
    async project({ file, content }) {
      const document = parseTaskDocument(content, file.path);
      if (!document) return { rows: [], edges: [] };
      const row = projectTask(document, currentDate());
      const structure = await resolvedStructure(document, resolveTarget);
      return {
        rows: [
          {
            id: document.id,
            kind: document.kind,
            data: {
              ...row,
              id: document.id,
              ...(structure
                ? { structure: taskStructureForProjection(structure) }
                : {}),
            },
          },
        ],
        edges: taskEdges(document, structure),
      };
    },
  };
}

export function resolveTaskHref(sourcePath: string, href: string): string {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#") || /^[a-z]+:/i.test(trimmed)) {
    return trimmed;
  }
  const [withoutHash] = trimmed.split("#");
  const target = withoutHash ?? trimmed;
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

export function taskEdges(
  document: ParsedTaskFile,
  structure: ResolvedTaskDocumentStructure | null = null,
): IndexProjectionEdgeInput[] {
  if (document.kind !== "task-list-navigation") {
    return (structure?.entries ?? []).map((entry) => ({
      sourceRowId: document.id,
      relation: entry.kind,
      targetRowId: entry.targetDocumentId,
      targetPath: entry.targetDocumentPath,
      targetText: entry.authoredHref,
      ordinal: structure!.entries.indexOf(entry),
      data: {
        headingPath: entry.headingPath,
        headingLevel: entry.headingLevel,
        headingText: entry.headingText,
        runId: entry.runId,
        positionInRun: entry.positionInRun,
        sourceStart: entry.sourceStart,
        sourceEnd: entry.sourceEnd,
      },
    }));
  }
  return document.structuralLinks.map((link) => ({
    sourceRowId: document.id,
    relation: "navigation-item",
    targetPath: resolveTaskHref(document.path, link.href) || null,
    targetText: link.href,
    ordinal: link.ordinal,
    ...(link.heading ? { data: { section: link.heading } } : {}),
  }));
}

function indexedLinks(
  document: ParsedTaskFile,
  structure: ResolvedTaskDocumentStructure | null,
): AppDatabaseLinkRecord[] {
  if (document.kind === "task-list-navigation") {
    return document.structuralLinks.map((link) => ({
      sourcePath: document.path,
      targetText: link.href,
      resolvedTargetPath: resolveTaskHref(document.path, link.href) || null,
      type: "link",
      count: 1,
      heading: link.heading,
      kind: "navigation-item",
      ordinal: link.ordinal,
    }));
  }
  return (structure?.entries ?? []).map((entry, ordinal) => ({
    sourcePath: document.path,
    targetText: entry.authoredHref,
    resolvedTargetPath: entry.targetDocumentPath,
    type: "link",
    count: 1,
    heading: entry.headingText,
    kind: entry.kind,
    ordinal,
  }));
}

export function taskDocumentToIndexedFile(
  document: ParsedTaskFile,
  structure: ResolvedTaskDocumentStructure | null = null,
  today?: string,
): AppDatabaseIndexedFile {
  const links = indexedLinks(document, structure);
  return {
    file: {
      path: document.path,
      normalizedPath: document.path,
      extension: "md",
      mtime: 1,
      size: document.raw.length,
      hash: document.id,
      indexed: true,
    },
    metadata: {
      path: document.path,
      hash: document.id,
      parserVersion: "tasks/v1",
      metadata: {},
    },
    links,
    tags: document.tags.map((tag) => ({
      path: document.path,
      tag,
      parts: tag.split("/"),
      hierarchy: [tag],
    })),
    properties: [],
    task: {
      ...projectTask(document, today),
      ...(structure ? { structure: taskStructureForProjection(structure) } : {}),
    },
  };
}

export async function indexTaskDocument(
  database: AppDatabase,
  document: ParsedTaskFile,
  resolveTarget: TaskStructureTargetResolver = async (sourcePath, href) => {
    const path = resolveTaskHref(sourcePath, href);
    const target = await database.getTaskRow({ path }).catch(() => null);
    return target && (target.kind === "task" || target.kind === "task-list")
      ? {
          id: target.documentId,
          path: target.documentPath,
          kind: target.kind,
          title: target.title,
        }
      : null;
  },
  today?: string,
): Promise<void> {
  await database.upsertIndexedFile(
    taskDocumentToIndexedFile(document, null, today),
  );
  const structure = await resolvedStructure(document, resolveTarget);
  await indexResolvedTaskDocument(database, document, structure, today);
}

export async function indexResolvedTaskDocument(
  database: AppDatabase,
  document: ParsedTaskFile,
  structure: ResolvedTaskDocumentStructure | null,
  today?: string,
): Promise<void> {
  await database.upsertIndexedFile(
    taskDocumentToIndexedFile(document, structure, today),
  );
  const projected = projectTask(document, today);
  await database.replaceProjectionSource({
    projectionId: PUBLIC_TASKS_PROJECTION_ID,
    sourcePath: document.path,
    sourceHash: document.id,
    writerPluginId: "tasks",
    rows: [
      {
        id: document.id,
        kind: document.kind,
        data: {
          ...projected,
          id: document.id,
          ...(structure
            ? { structure: taskStructureForProjection(structure) }
            : {}),
        },
      },
    ],
    edges: taskEdges(document, structure),
  });
}
