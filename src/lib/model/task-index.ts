import type {
  AppDatabase,
  AppDatabaseIndexedFile,
  AppDatabaseLinkRecord,
  IndexProjectionEdgeInput,
  IndexProjectionRegistration,
} from "@lapis-notes/api/app-database";
import {
  PUBLIC_TASKS_PROJECTION_ID,
  TASK_PROJECTION_FIELDS,
  TASK_PROJECTION_VERSION,
} from "@lapis-notes/api/app-database";
import { parseTaskDocument, type ParsedTaskFile } from "./task-document";
import { projectTask } from "./task-projection";

export function createTasksProjectionRegistration(): IndexProjectionRegistration {
  return {
    id: "task",
    version: TASK_PROJECTION_VERSION,
    visibility: "public",
    fields: TASK_PROJECTION_FIELDS,
    source: {
      extensions: ["md", "markdown"],
    },
    project({ file, content }) {
      const document = parseTaskDocument(content, file.path);
      if (!document) return { rows: [], edges: [] };
      const row = projectTask(document);
      return {
        rows: [{ id: document.id, kind: document.kind, data: { ...row, id: document.id } }],
        edges: taskEdges(document),
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

export function taskEdges(document: ParsedTaskFile): IndexProjectionEdgeInput[] {
  return document.structuralLinks
    .filter((link) => link.kind === "subtask" || link.kind === "list-item")
    .map((link) => ({
      sourceRowId: document.id,
      relation: link.kind,
      targetPath: resolveTaskHref(document.path, link.href) || null,
      targetText: link.href,
      ordinal: link.ordinal,
    }));
}

export function taskDocumentToIndexedFile(
  document: ParsedTaskFile,
): AppDatabaseIndexedFile {
  const links: AppDatabaseLinkRecord[] = document.structuralLinks.map(
    (link) => ({
      sourcePath: document.path,
      targetText: link.href,
      resolvedTargetPath: resolveTaskHref(document.path, link.href) || null,
      type: "link",
      count: 1,
      heading: link.heading,
      kind: link.kind,
      ordinal: link.ordinal,
    }),
  );
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
    task: projectTask(document),
  };
}

export async function indexTaskDocument(
  database: AppDatabase,
  document: ParsedTaskFile,
): Promise<void> {
  await database.upsertIndexedFile(taskDocumentToIndexedFile(document));
  await database.replaceProjectionSource({
    projectionId: PUBLIC_TASKS_PROJECTION_ID,
    sourcePath: document.path,
    sourceHash: document.id,
    writerPluginId: "tasks",
    rows: [
      {
        id: document.id,
        kind: document.kind,
        data: { ...projectTask(document), id: document.id },
      },
    ],
    edges: taskEdges(document),
  });
}
