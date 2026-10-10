import type { App, MarkdownFileSurfaceHandle } from "@lapis-notes/api";

type TaskFileSurface = Pick<MarkdownFileSurfaceHandle, "flush" | "exit">;

const surfaces = new WeakMap<App, Map<string, Set<TaskFileSurface>>>();

export function registerTaskFileSurface(
  app: App,
  path: string,
  handle: TaskFileSurface,
): () => void {
  let files = surfaces.get(app);
  if (!files) surfaces.set(app, (files = new Map()));
  let handles = files.get(path);
  if (!handles) files.set(path, (handles = new Set()));
  handles.add(handle);
  return () => {
    handles!.delete(handle);
    if (!handles!.size) files!.delete(path);
  };
}

export async function flushTaskFileSurfaces(
  app: App,
  path?: string,
  exit = false,
): Promise<void> {
  const files = surfaces.get(app);
  const handles = path
    ? [...(files?.get(path) ?? [])]
    : [...(files?.values() ?? [])].flatMap((entries) => [...entries]);
  for (const handle of handles) {
    if (!(await (exit ? handle.exit() : handle.flush())))
      throw new Error(
        "The Markdown document could not be saved. Your editor remains open.",
      );
  }
}
