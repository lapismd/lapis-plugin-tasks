<script lang="ts">
  import {
    Component,
    MarkdownRenderer,
    type App,
    type MarkdownFileSurfaceHandle,
  } from "@lapis-notes/api";
  import { onDestroy, untrack } from "svelte";
  import type { TaskRepository } from "../model/task-repository";
  import type { TasksMarkdownSurfaceController } from "../task-list-surface";
  import "./TaskListMarkdownSurface.css";
  import { registerTaskFileSurface } from "../task-file-surfaces";

  let {
    app,
    repository,
    path,
    controller,
    editing = $bindable(false),
  }: {
    app: App;
    repository: TaskRepository;
    path: string;
    controller: TasksMarkdownSurfaceController;
    editing?: boolean;
  } = $props();

  let container = $state<HTMLElement | null>(null);
  let error = $state<string | null>(null);
  let providerAvailable = $state(true);
  let surfaceHandle: MarkdownFileSurfaceHandle | null = null;
  let mountedTarget: HTMLElement | null = null;
  let mountedSourcePath: string | null = null;
  let disposeMountedSurface: (() => void) | null = null;

  class FallbackRenderOwner extends Component {}

  $effect(() => {
    const target = container;
    const sourcePath = path;
    if (!target || !sourcePath) return;
    if (target === mountedTarget && sourcePath === mountedSourcePath) return;

    disposeMountedSurface?.();
    mountedTarget = target;
    mountedSourcePath = sourcePath;

    disposeMountedSurface = untrack(() => {
      const surfaceApp = app;
      const surfaceRepository = repository;
      const surfaceController = controller;
      const hasSurfaceProvider = surfaceApp.markdownFileSurfaces.available;
      let unregister: (() => void) | null = null;
      let disposed = false;
      let handle: MarkdownFileSurfaceHandle | null = null;
      let fallbackOwner: FallbackRenderOwner | null = null;
      target.replaceChildren();
      error = null;
      providerAvailable = hasSurfaceProvider;

      void (async () => {
        try {
          const file = surfaceApp.vault.getFileByPath(sourcePath);
          if (!file) throw new Error(`Missing task file: ${sourcePath}`);
          if (hasSurfaceProvider) {
            handle = await surfaceApp.markdownFileSurfaces.mount({
              containerEl: target,
              file,
              editable: true,
              activation: "manual",
              returnToPreviewOnBlur: false,
              surface: { id: "tasks-markdown", context: surfaceController },
              onEditingChange: (next) => (editing = next),
            });
            if (disposed) {
              await handle.dispose();
              return;
            }
            unregister = registerTaskFileSurface(
              surfaceApp,
              sourcePath,
              handle,
            );
            surfaceHandle = handle;
            return;
          }

          fallbackOwner = new FallbackRenderOwner();
          fallbackOwner.containerEl = target;
          fallbackOwner.load();
          const document = await surfaceRepository.getDocument(sourcePath);
          await MarkdownRenderer.render(
            surfaceApp,
            document.raw,
            target,
            sourcePath,
            fallbackOwner!,
          );
        } catch (cause) {
          if (!disposed) {
            error = cause instanceof Error ? cause.message : String(cause);
          }
        }
      })();

      return () => {
        disposed = true;
        unregister?.();
        if (surfaceHandle === handle) surfaceHandle = null;
        if (handle) void handle.dispose();
        fallbackOwner?.unload();
        target.replaceChildren();
      };
    });
  });

  onDestroy(() => {
    disposeMountedSurface?.();
    disposeMountedSurface = null;
    mountedTarget = null;
    mountedSourcePath = null;
  });

  async function openNote() {
    const file = app.vault.getFileByPath(path);
    if (file) await app.openFile(file);
  }

  export function enter(): void {
    error = null;
    surfaceHandle?.enter();
  }

  export async function flush(): Promise<boolean> {
    return surfaceHandle ? surfaceHandle.flush() : true;
  }

  export async function exit(): Promise<boolean> {
    if (!surfaceHandle) return true;
    const exited = await surfaceHandle.exit();
    if (!exited) error = "The Markdown file could not be saved.";
    return exited;
  }
</script>

<section
  class="task-list-markdown-surface"
  class:task-list-markdown-surface--editing={editing}
  data-task-markdown-surface
  data-hide-completed={(controller.hideCompleted && !editing) || undefined}
  data-editing={editing}
>
  {#if !providerAvailable}
    <div class="task-list-markdown-surface__fallback">
      <span>Read-only Markdown preview</span>
      <button type="button" onclick={() => void openNote()}>Open note</button>
    </div>
  {/if}
  {#if error}
    <p class="task-list-markdown-surface__error" role="alert">{error}</p>
  {/if}
  <div class="task-list-markdown-surface__content" bind:this={container}></div>
</section>
