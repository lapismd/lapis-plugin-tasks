<script lang="ts">
  import { Editor, type App } from "@lapis-notes/api";
  import { Prec } from "@codemirror/state";
  import { EditorView, placeholder } from "@codemirror/view";
  import { untrack } from "svelte";
  import { getTaskNotes, type Task, type TaskRepository } from "../model";
  import { registerTaskFileSurface } from "../task-file-surfaces";

  let {
    app,
    repository,
    task,
  }: { app: App; repository: TaskRepository; task: Task } = $props();
  let container = $state<HTMLElement | null>(null);
  let loaded = $state(false);
  let error = $state<string | null>(null);
  // Task projections refresh after saves; only changing files replaces the buffer.
  const sourcePath = $derived(task.sourcePath);

  $effect(() => {
    const path = sourcePath;
    const ownerApp = app;
    const ownerRepository = repository;
    const target = container;
    if (!path || !target) return;
    return untrack(() => {
      let disposed = false;
      let savedNotes = "";
      let saving: Promise<boolean> | null = null;
      let editor: Editor | null = null;
      loaded = false;
      error = null;

      function extensions() {
        const registered = ownerApp.editorExtensions("markdown", {
          mode: "live-preview",
          file: path,
        });
        if (!registered.length)
          throw new Error("Enable the Markdown plugin to edit task notes.");
        return [
          ...registered,
          Prec.highest(
            EditorView.contentAttributes.of({ "aria-label": "Task notes" }),
          ),
          EditorView.lineWrapping,
          placeholder("Notes"),
          EditorView.theme({
            "&": { height: "auto" },
            "&.cm-focused": { outline: "none" },
            "& > .cm-scroller": {
              overflow: "visible",
              scrollbarGutter: "auto",
            },
          }),
          EditorView.domEventHandlers({ blur: () => void save() }),
        ];
      }

      const ready = ownerRepository
        .getTaskDocument(path)
        .then((document) => {
          if (disposed) return;
          savedNotes = getTaskNotes(document.body);
          // This buffer is a body fragment; Tasks owns complete-file persistence.
          editor = new Editor(savedNotes, extensions(), ownerApp);
          editor.persistence = "external";
          const root = target.getRootNode();
          if (root instanceof Document || root instanceof ShadowRoot)
            editor.view.setRoot(root);
          target.append(editor.view.dom);
          loaded = true;
        })
        .catch((cause) => {
          if (!disposed) error = String(cause);
        });

      async function save(): Promise<boolean> {
        if (saving) return saving;
        saving = (async () => {
          await ready;
          if (disposed) return false;
          if (!loaded || !editor) return true;
          try {
            await editor.flushChanges();
            while (editor.getValue() !== savedNotes) {
              const next = editor.getValue();
              await ownerRepository.setNotes(
                path!,
                next,
                savedNotes,
                ownerRepository.now().toISOString(),
              );
              savedNotes = next;
            }
            error = null;
            return true;
          } catch (cause) {
            error = `The task notes could not be saved. ${cause instanceof Error ? cause.message : String(cause)}`;
            return false;
          }
        })();
        try {
          return await saving;
        } finally {
          saving = null;
        }
      }
      function refreshExtensions() {
        if (!editor || disposed) return;
        try {
          editor.updateExtensions(extensions());
        } catch (cause) {
          error = cause instanceof Error ? cause.message : String(cause);
        }
      }
      const configurationChanged = ownerApp.configuration.on(
        "updated",
        refreshExtensions,
      );
      const pluginEnabled = ownerApp.plugins.on(
        "plugin-enabled",
        refreshExtensions,
      );
      const pluginDisabled = ownerApp.plugins.on(
        "plugin-disabled",
        refreshExtensions,
      );
      const unregister = registerTaskFileSurface(ownerApp, path, {
        flush: save,
        exit: save,
      });
      return () => {
        disposed = true;
        unregister();
        ownerApp.configuration.offref(configurationChanged);
        ownerApp.plugins.offref(pluginEnabled);
        ownerApp.plugins.offref(pluginDisabled);
        editor?.destroy();
        target.replaceChildren();
      };
    });
  });
</script>

<div
  class="task-inline-notes"
  data-task-inline-notes
  aria-busy={!loaded && !error}
>
  <div bind:this={container}></div>
  {#if error}<p role="alert">{error}</p>{/if}
</div>

<style>
  .task-inline-notes {
    --mira-font-size: 0.82rem;
    --mira-line-height: 1.45;
    --mira-editor-background: transparent;
    --mira-foreground: var(--kanban-muted);
    --file-margins-x: 0px;
    --file-margins-y: 0px;
    --file-line-width: 100%;
    min-width: 0;
    width: 100%;
  }

  .task-inline-notes:focus-within {
    --mira-foreground: var(--kanban-foreground);
  }
</style>
