import type {
  AppDatabase,
  AppDatabaseIndexedFile,
  AppDatabaseLinkRecord,
  IndexedProjectionContributor,
} from "@lapis-notes/api";
import { parseTaskDocument, type ParsedTaskFile } from "./task-document";
import { projectTask } from "./task-projection";

export function createTasksProjectionContributor(): IndexedProjectionContributor {
  return {
    project({ file, content }) {
      const document = parseTaskDocument(content, file.path);
      return { task: document ? projectTask(document) : null };
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
}
