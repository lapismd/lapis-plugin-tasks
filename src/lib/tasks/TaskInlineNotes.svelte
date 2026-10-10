<script lang="ts">
  import type { App } from "@lapis-notes/api";
  import { autosizeTextarea } from "@lapismd/design-core/forms";
  import { untrack } from "svelte";
  import { getTaskNotes, type Task, type TaskRepository } from "../model";
  import { registerTaskFileSurface } from "../task-file-surfaces";

  let {
    app,
    repository,
    task,
  }: { app: App; repository: TaskRepository; task: Task } = $props();
  let notesDraft = $state("");
  let loaded = $state(false);
  let error = $state<string | null>(null);
  let flush: () => Promise<boolean> = async () => false;

  $effect(() => {
    const path = task.sourcePath;
    const ownerApp = app;
    const ownerRepository = repository;
    if (!path) return;
    return untrack(() => {
      let disposed = false;
      let savedNotes = "";
      let saving: Promise<boolean> | null = null;
      loaded = false;
      error = null;
      const ready = ownerRepository
        .getTaskDocument(path)
        .then((document) => {
          if (disposed) return;
          savedNotes = getTaskNotes(document.body);
          notesDraft = savedNotes;
          loaded = true;
        })
        .catch((cause) => {
          if (!disposed) error = String(cause);
        });

      async function save(): Promise<boolean> {
        if (saving) return saving;
        saving = (async () => {
          await ready;
          if (disposed || !loaded) return false;
          try {
            while (notesDraft !== savedNotes) {
              const next = notesDraft;
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
      flush = save;
      const unregister = registerTaskFileSurface(ownerApp, path, {
        flush: save,
        exit: save,
      });
      return () => {
        disposed = true;
        unregister();
      };
    });
  });
</script>

<div data-task-inline-notes>
  <textarea
    bind:value={notesDraft}
    rows="1"
    class="task-preview-row__notes-input"
    placeholder="Notes"
    aria-label="Task notes"
    disabled={!loaded}
    use:autosizeTextarea={notesDraft}
    onblur={() => void flush()}
  ></textarea>
  {#if error}<p role="alert">{error}</p>{/if}
</div>
