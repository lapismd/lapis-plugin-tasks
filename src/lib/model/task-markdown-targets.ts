import type { App } from "@lapis-notes/api";
import { createAppTaskStructureResolver } from "./task-index";
import { parseTaskDocument } from "./task-document";
import type { StructuralTaskTargetResolver } from "./task-list-items";

/** Resolve this document's links without relying on the metadata hot cache. */
export async function resolveTaskMarkdownTargets(
  app: App,
  source: string,
  sourcePath: string,
): Promise<StructuralTaskTargetResolver> {
  const document = parseTaskDocument(source, sourcePath);
  const hrefs = new Set(document?.structuralLinks.map((link) => link.href));
  const resolveTarget = createAppTaskStructureResolver(app);
  const targets = new Map(
    await Promise.all(
      [...hrefs].map(
        async (href) => [href, await resolveTarget(sourcePath, href)] as const,
      ),
    ),
  );
  return (_sourcePath, href) => targets.get(href) ?? null;
}
