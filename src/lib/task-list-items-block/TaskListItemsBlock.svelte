<script lang="ts">
  import type { App, MarkdownSurfaceContext } from "@lapis-notes/api";
  import { onMount } from "svelte";
  import { catalogTaskFromSummary } from "../model/catalog-adapter";
  import type { TaskRepository } from "../model/task-repository";
  import type {
    TaskListItemsEntry,
    TaskListItemsSection,
  } from "../model/task-list-items";
  import type { ChecklistItem, Task } from "../model";
  import { asTasksListSurfaceController } from "../task-list-surface";
  import ApplicationPlannerTaskRow from "../tasks/application-planner-task-row/ApplicationPlannerTaskRow.svelte";
  import "./TaskListItemsBlock.css";

  type ResolvedEntry = {
    entry: TaskListItemsEntry;
    task: Task | null;
    kind: "task" | "task-list" | "unresolved";
    path: string | null;
    title: string;
  };

  let {
    app,
    repository,
    sourcePath,
    section,
    surface,
    onRevealSource,
    onReplaceEntries,
  }: {
    app: App;
    repository: TaskRepository;
    sourcePath: string;
    section: TaskListItemsSection;
    surface: MarkdownSurfaceContext;
    onRevealSource?: () => void;
    onReplaceEntries?: (entries: TaskListItemsEntry[]) => void | Promise<void>;
  } = $props();

  const controller = $derived(asTasksListSurfaceController(surface.context));
  let rows = $state<ResolvedEntry[]>([]);
  let error = $state<string | null>(null);
  let creating = $state(false);
  let newTaskTitle = $state("");
  let draggedIndex = $state<number | null>(null);

  async function load() {
    try {
      rows = await Promise.all(
        section.entries.map(async (entry): Promise<ResolvedEntry> => {
          const summary = await repository.resolveTaskListItem(sourcePath, entry.target);
          if (!summary) {
            return {
              entry,
              task: null,
              kind: "unresolved",
              path: null,
              title: entry.label,
            };
          }
          return {
            entry,
            task: summary.kind === "task" ? catalogTaskFromSummary(summary) : null,
            kind: summary.kind === "task-list" ? "task-list" : "task",
            path: summary.path,
            title: summary.title,
          };
        }),
      );
      error = null;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function openPath(path: string | null, target: string) {
    if (path && controller?.onOpenNote) {
      await controller.onOpenNote(path);
      return;
    }
    const resolved = path ? app.vault.getFileByPath(path) : null;
    if (resolved) await app.openFile(resolved);
    else error = `Could not resolve ${target}.`;
  }

  async function toggleDone(task: Task) {
    const path = task.sourcePath ?? task.id;
    if (task.status === "completed" || task.status === "done") {
      await repository.reopen(path, new Date().toISOString());
    } else {
      await repository.complete(path, new Date().toISOString());
    }
    await controller?.onRefresh?.();
    await load();
  }

  async function loadChecklist(task: Task): Promise<ChecklistItem[]> {
    return (await repository.getTaskDocument(task.sourcePath ?? task.id)).checklist;
  }

  async function toggleChecklist(
    task: Task,
    item: ChecklistItem,
    checked: boolean,
  ): Promise<ChecklistItem[]> {
    const document = await repository.setChecklistItemChecked(
      task.sourcePath ?? task.id,
      item.position,
      item.text,
      checked,
    );
    await controller?.onRefresh?.();
    return document.checklist;
  }

  async function selectTask(task: Task) {
    if (controller?.onActiveTaskChange) {
      await controller.onActiveTaskChange(task.id);
      return;
    }
    await openPath(task.sourcePath ?? null, task.sourcePath ?? task.id);
  }

  async function createTask() {
    const title = newTaskTitle.trim();
    if (!title || !controller?.onCreateInSection) return;
    creating = true;
    try {
      await controller.onCreateInSection(section, title);
      newTaskTitle = "";
      await load();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      creating = false;
    }
  }

  async function dropAt(index: number) {
    if (draggedIndex == null || draggedIndex === index) return;
    const next = [...section.entries];
    const [moving] = next.splice(draggedIndex, 1);
    if (!moving) return;
    next.splice(index, 0, moving);
    draggedIndex = null;
    if (onReplaceEntries) await onReplaceEntries(next);
    else await controller?.onReorderSection?.(section, next);
  }

  onMount(() => {
    void load();
    const changed = app.metadataCache.on("changed", () => void load());
    const deleted = app.metadataCache.on("deleted", () => void load());
    return () => {
      app.metadataCache.offref(changed);
      app.metadataCache.offref(deleted);
    };
  });
</script>

<section
  class="task-list-items-block"
  data-task-list-items-block
  data-task-list-surface={controller ? "tasks" : "markdown"}
>
  <header class="task-list-items-block__header">
    <h2>Items</h2>
    <button type="button" class="task-list-items-block__source" onclick={onRevealSource}>
      Source
    </button>
  </header>

  {#if error}
    <p class="task-list-items-block__error" role="alert">{error}</p>
  {/if}

  <div class="task-list-items-block__rows" role="list">
    {#each rows as row, index (row.entry.from + row.entry.target)}
      {#if row.task}
        <div
          class="task-list-items-block__task"
          role="listitem"
          draggable={Boolean(controller)}
          ondragstart={() => (draggedIndex = index)}
          ondragover={(event) => controller && event.preventDefault()}
          ondrop={() => void dropAt(index)}
        >
          <ApplicationPlannerTaskRow
            task={row.task}
            selected={controller?.activeTaskId === row.task.id}
            selectOnSurfaceClick
            areaOptions={[]}
            onSelectTask={(task) => void selectTask(task)}
            onRequestOpen={() => void selectTask(row.task!)}
            onToggleDone={(task) => void toggleDone(task)}
            onLoadChecklist={loadChecklist}
            onToggleChecklistItem={toggleChecklist}
          />
        </div>
      {:else if row.kind === "task-list"}
        <button
          type="button"
          class="task-list-items-block__list"
          onclick={() => void openPath(row.path, row.entry.target)}
        >
          <span>{row.title}</span>
          <small>{row.entry.target}</small>
        </button>
      {:else}
        <button
          type="button"
          class="task-list-items-block__fallback"
          onclick={() => void openPath(null, row.entry.target)}
        >
          <span>{row.entry.label}</span>
          <small>{row.entry.target}</small>
        </button>
      {/if}
    {/each}
  </div>

  {#if controller?.onCreateInSection}
    <form class="task-list-items-block__create" onsubmit={(event) => { event.preventDefault(); void createTask(); }}>
      <input bind:value={newTaskTitle} aria-label="New task title" placeholder="New task" />
      <button type="submit" disabled={creating || !newTaskTitle.trim()}>Add</button>
    </form>
  {/if}
</section>
