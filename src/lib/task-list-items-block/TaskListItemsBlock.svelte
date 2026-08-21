<script lang="ts">
  import type { App, MarkdownSurfaceContext } from "@lapis-notes/api";
  import CodeXmlIcon from "@lucide/svelte/icons/code-xml";
  import { onMount } from "svelte";
  import { catalogTaskFromSummary } from "../model/catalog-adapter";
  import type { TaskRepository } from "../model/task-repository";
  import type {
    StructuralTaskRun,
    StructuralTaskRunEntry,
    StructuralTaskRunEntryInput,
  } from "../model/task-list-items";
  import {
    getPlannerSelectionPosition,
    type ApplicationTask,
    type ChecklistItem,
    type Task,
    type TaskCatalogPlanAt,
    type TaskPriority,
    type TaskQuickCreateInput,
    type TaskWhen,
  } from "../model";
  import {
    asTasksMarkdownSurfaceController,
    taskForTasksMarkdownMutation,
  } from "../task-list-surface";
  import ApplicationPlannerTaskRow from "../tasks/application-planner-task-row/ApplicationPlannerTaskRow.svelte";
  import {
    applyApplicationTaskPatch,
    resolvePlannerTaskSelection,
  } from "../tasks/lib/application-task-planner-mode-helpers";
  import TaskQuickCreateActions from "../tasks/task-planner/TaskQuickCreateActions.svelte";
  import TaskQuickCreateRow from "../tasks/task-planner/TaskQuickCreateRow.svelte";
  import TaskListItemsListRow from "./TaskListItemsListRow.svelte";
  import TaskRunBlock from "./TaskListItemsBlock.svelte";
  import "./TaskListItemsBlock.css";

  type ResolvedEntry = {
    entry: StructuralTaskRunEntry;
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
    section: StructuralTaskRun;
    surface: MarkdownSurfaceContext;
    onRevealSource?: () => void;
    onReplaceEntries?: (
      entries: ReadonlyArray<StructuralTaskRunEntryInput>,
    ) => void | Promise<void>;
  } = $props();

  const controller = $derived(asTasksMarkdownSurfaceController(surface.context));
  let rows = $state<ResolvedEntry[]>([]);
  let error = $state<string | null>(null);
  let creating = $state(false);
  let newTaskTitle = $state("");
  let draggedIndex = $state<number | null>(null);
  let expandedTaskId = $state<string | null>(null);
  let quickCreateActive = $state(false);
  let quickCreateDueAt = $state<string | undefined>(undefined);
  let quickCreatePriority = $state<TaskPriority | undefined>(undefined);
  let quickCreateSchedule = $state<{
    scheduledAt?: string;
    when?: TaskWhen;
    planAt?: TaskCatalogPlanAt;
  }>({});
  let quickCreateInteractionOpen = $state(false);
  let selectedTaskIds = $state<string[]>([]);
  let selectionAnchorTaskId = $state<string | null>(null);
  let selectedListPath = $state<string | null>(null);
  let expandedListPaths = $state<string[]>([]);
  let nestedRuns = $state<Record<string, StructuralTaskRun[]>>({});
  let loadRevision = 0;
  const taskRows = $derived(
    rows.flatMap((row) => (row.task ? [row.task] : [])),
  );
  const selectedTaskIdSet = $derived(new Set(selectedTaskIds));

  $effect(() => {
    const activeTaskId = controller?.activeTaskId;
    if (activeTaskId === undefined) return;
    if (!activeTaskId) {
      selectedTaskIds = [];
      selectionAnchorTaskId = null;
      return;
    }
    if (selectedTaskIds.includes(activeTaskId)) return;
    selectedTaskIds = [activeTaskId];
    selectionAnchorTaskId = activeTaskId;
  });

  $effect(() => {
    if (controller?.activeListPath !== undefined) {
      selectedListPath = controller.activeListPath;
    }
  });

  $effect(() => {
    const openTaskId = expandedTaskId;
    if (!openTaskId) return;
    const closeOutside = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      if (
        event.target.closest(
          `[data-planner-task-id="${CSS.escape(openTaskId)}"], dialog, [popover], [role="dialog"], [data-task-due-picker], [data-task-when-picker], [data-task-at-picker], [data-task-area-picker]`,
        )
      ) {
        return;
      }
      expandedTaskId = null;
    };
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("focusin", closeOutside, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("focusin", closeOutside, true);
    };
  });

  async function load() {
    const revision = ++loadRevision;
    try {
      const nextRows = await Promise.all(
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
      if (revision !== loadRevision) return;
      rows = nextRows;
      selectedTaskIds = selectedTaskIds.filter((taskId) =>
        nextRows.some((row) => row.task?.id === taskId),
      );
      error = null;
    } catch (cause) {
      if (revision !== loadRevision) return;
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

  function selectTask(task: Task, event: MouseEvent) {
    selectedListPath = null;
    void controller?.onActiveListChange?.(null);
    const mode = event.shiftKey
      ? "range"
      : event.metaKey || event.ctrlKey
        ? "toggle"
        : "replace";
    const selection = resolvePlannerTaskSelection(
      taskRows.map((row) => row.id),
      selectedTaskIds,
      selectionAnchorTaskId,
      task.id,
      mode,
    );
    selectedTaskIds = selection.taskIds;
    selectionAnchorTaskId = selection.anchorTaskId;
  }

  function selectList(row: ResolvedEntry) {
    if (!row.path) return;
    selectedTaskIds = [];
    selectionAnchorTaskId = null;
    selectedListPath = row.path;
    void controller?.onActiveListChange?.(row.path);
  }

  async function openList(row: ResolvedEntry) {
    if (!row.path) return openPath(null, row.entry.target);
    if (controller?.onOpenList) {
      await controller.onOpenList(row.path, row.title);
      return;
    }
    await openPath(row.path, row.entry.target);
  }

  async function toggleExpandedList(row: ResolvedEntry) {
    if (!row.path) return;
    if (expandedListPaths.includes(row.path)) {
      expandedListPaths = expandedListPaths.filter((path) => path !== row.path);
      return;
    }
    expandedListPaths = [...expandedListPaths, row.path];
    if (nestedRuns[row.path]) return;
    try {
      nestedRuns = {
        ...nestedRuns,
        [row.path]: await repository.getStructuralTaskRuns(row.path),
      };
    } catch (cause) {
      expandedListPaths = expandedListPaths.filter((path) => path !== row.path);
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function updateTask(task: Task, patch: Partial<ApplicationTask>) {
    if (!controller?.onSaveTask) return;
    const mutationTask = taskForTasksMarkdownMutation(task, controller.tasks);
    await controller.onSaveTask(
      applyApplicationTaskPatch(mutationTask, patch, new Date().toISOString()),
    );
    await load();
  }

  async function requestOpenTask(
    task: Task,
    source: "details-button" | "inline" = "inline",
  ) {
    if (source === "details-button") {
      if (controller?.onActiveTaskChange) {
        await controller.onActiveTaskChange(
          controller.activeTaskId === task.id ? null : task.id,
        );
      } else {
        await openPath(task.sourcePath ?? null, task.sourcePath ?? task.id);
      }
      return;
    }
    expandedTaskId = expandedTaskId === task.id ? null : task.id;
  }

  async function createTask() {
    const title = newTaskTitle.trim();
    if (!title || !controller?.onCreateInSection) return;
    creating = true;
    try {
      const view: TaskQuickCreateInput["view"] = quickCreateSchedule.scheduledAt
        ? "upcoming"
        : quickCreateSchedule.when === "today" ||
            quickCreateSchedule.when === "this-evening"
          ? "today"
          : quickCreateSchedule.when === "someday"
            ? "someday"
            : "anytime";
      const created = await controller.onCreateInSection(section, {
        title,
        view,
        order: section.entries.length,
        dueAt: quickCreateDueAt,
        priority: quickCreatePriority,
        ...quickCreateSchedule,
      });
      if (created) {
        await replaceEntries([...section.entries, created]);
      }
      newTaskTitle = "";
      quickCreateDueAt = undefined;
      quickCreatePriority = undefined;
      quickCreateSchedule = {};
      quickCreateInteractionOpen = false;
      quickCreateActive = false;
      await load();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      creating = false;
    }
  }

  function handleQuickCreateFocusOut(event: FocusEvent) {
    if (quickCreateInteractionOpen) return;
    const editor = event.currentTarget as HTMLElement;
    const nextTarget =
      event.relatedTarget instanceof Element ? event.relatedTarget : null;
    if (nextTarget && editor.contains(nextTarget)) return;
    queueMicrotask(() => {
      if (!editor.contains(document.activeElement)) quickCreateActive = false;
    });
  }

  function startDrag(event: DragEvent, index: number) {
    draggedIndex = index;
    event.dataTransfer?.setData(
      "application/x-lapis-task-run-entry",
      JSON.stringify({
        documentPath: section.documentPath,
        runId: section.id,
        index,
      }),
    );
  }

  async function dropAt(index: number, event: DragEvent) {
    const payload = event.dataTransfer?.getData(
      "application/x-lapis-task-run-entry",
    );
    if (payload) {
      try {
        const source = JSON.parse(payload) as {
          documentPath: string;
          runId: string;
          index: number;
        };
        if (source.runId !== section.id) {
          draggedIndex = null;
          await controller?.onMoveEntry?.(source, { run: section, index });
          await load();
          return;
        }
      } catch {
        // Fall through to the guarded within-run reorder.
      }
    }
    if (draggedIndex == null || draggedIndex === index) return;
    const next = [...section.entries];
    const [moving] = next.splice(draggedIndex, 1);
    if (!moving) return;
    next.splice(index, 0, moving);
    draggedIndex = null;
    await replaceEntries(next);
  }

  async function replaceEntries(
    entries: ReadonlyArray<StructuralTaskRunEntryInput>,
  ) {
    if (onReplaceEntries) await onReplaceEntries(entries);
    else await controller?.onReorderSection?.(section, entries);
  }

  async function moveTask(task: Task, direction: -1 | 1) {
    const sourceRowIndex = taskRows.findIndex((row) => row.id === task.id);
    const targetTask = taskRows[sourceRowIndex + direction];
    const sourceRow = rows.find((row) => row.task?.id === task.id);
    const targetRow = targetTask
      ? rows.find((row) => row.task?.id === targetTask.id)
      : null;
    if (!sourceRow || !targetRow) return;
    const sourceIndex = findEntryIndex(sourceRow.entry);
    const targetIndex = findEntryIndex(targetRow.entry);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...section.entries];
    [next[sourceIndex], next[targetIndex]] = [next[targetIndex]!, next[sourceIndex]!];
    await replaceEntries(next);
  }

  async function removeTask(task: Task) {
    const row = rows.find((entry) => entry.task?.id === task.id);
    if (!row || !controller?.onDeleteTask) return;
    const entryIndex = findEntryIndex(row.entry);
    if (entryIndex < 0) return;
    expandedTaskId = expandedTaskId === task.id ? null : expandedTaskId;
    selectedTaskIds = selectedTaskIds.filter((taskId) => taskId !== task.id);
    await replaceEntries(
      section.entries.filter((_, index) => index !== entryIndex),
    );
    await controller.onDeleteTask(task);
  }

  async function removeList(row: ResolvedEntry) {
    if (!row.path || !controller?.onDeleteList) return;
    const entryIndex = findEntryIndex(row.entry);
    if (entryIndex < 0) return;
    if (selectedListPath === row.path) selectedListPath = null;
    await replaceEntries(
      section.entries.filter((_, index) => index !== entryIndex),
    );
    await controller.onDeleteList(row.path, sourcePath);
    await controller.onActiveListChange?.(null);
    await load();
  }

  function findEntryIndex(entry: StructuralTaskRunEntry): number {
    return section.entries.findIndex(
      (candidate) =>
        candidate.from === entry.from &&
        candidate.to === entry.to &&
        candidate.target === entry.target,
    );
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
  data-structural-task-run
  data-task-list-surface={controller ? "tasks" : "markdown"}
  data-editable-markdown-ignore-click
>
  {#if onRevealSource}
    <header class="task-list-items-block__header">
      <button
        type="button"
        class="task-list-items-block__source"
        aria-label="Edit task run source"
        title="Edit source"
        onclick={onRevealSource}
      >
        <CodeXmlIcon aria-hidden="true" />
      </button>
    </header>
  {/if}

  {#if error}
    <p class="task-list-items-block__error" role="alert">{error}</p>
  {/if}

  <div class="task-list-items-block__rows" role="list">
    {#each rows as row, index (row.entry.from + row.entry.target)}
      {#if row.task}
        {@const taskIndex = taskRows.findIndex((task) => task.id === row.task!.id)}
        <div
          class="task-list-items-block__task"
          role="listitem"
          draggable={Boolean(controller)}
          ondragstart={(event) => startDrag(event, index)}
          ondragover={(event) => controller && event.preventDefault()}
          ondrop={(event) => void dropAt(index, event)}
        >
          <ApplicationPlannerTaskRow
            task={row.task}
            {taskIndex}
            taskTotal={taskRows.length}
            selected={selectedTaskIdSet.has(row.task.id)}
            selectionPosition={getPlannerSelectionPosition(
              taskRows,
              selectedTaskIdSet,
              row.task.id,
              taskIndex,
            )}
            expanded={expandedTaskId === row.task.id}
            reorderable={Boolean(controller)}
            selectOnSurfaceClick={false}
            areaOptions={[]}
            onSelectTask={selectTask}
            onRequestOpen={(_taskId, source) =>
              void requestOpenTask(row.task!, source)}
            onToggleDone={(task) => void toggleDone(task)}
            onUpdateTask={(task, patch) => void updateTask(task, patch)}
            onRemoveTask={(task) => void removeTask(task)}
            onLoadChecklist={loadChecklist}
            onToggleChecklistItem={toggleChecklist}
            onMoveTask={(task, direction) => void moveTask(task, direction)}
          />
        </div>
      {:else if row.kind === "task-list"}
        <div
          class="task-list-items-block__list"
          role="listitem"
          draggable={Boolean(controller)}
          ondragstart={(event) => startDrag(event, index)}
          ondragover={(event) => controller && event.preventDefault()}
          ondrop={(event) => void dropAt(index, event)}
        >
          <TaskListItemsListRow
            title={row.title}
            target={row.entry.target}
            selected={selectedListPath === row.path}
            expanded={Boolean(row.path && expandedListPaths.includes(row.path))}
            canDrag={Boolean(controller)}
            canDelete={Boolean(controller?.onDeleteList)}
            onSelect={() => selectList(row)}
            onOpen={() => openList(row)}
            onToggleExpanded={() => toggleExpandedList(row)}
            onDelete={() => removeList(row)}
          />
          {#if row.path && expandedListPaths.includes(row.path)}
            <div class="task-list-items-block__nested" data-task-list-nested-runs>
              {#each nestedRuns[row.path] ?? [] as nestedRun (nestedRun.id)}
                <TaskRunBlock
                  {app}
                  {repository}
                  sourcePath={row.path}
                  section={nestedRun}
                  {surface}
                />
              {/each}
            </div>
          {/if}
        </div>
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
    <TaskQuickCreateRow
      group={`task-run:${section.id}`}
      value={newTaskTitle}
      active={quickCreateActive}
      busy={creating}
      shortcut={false}
      onActivate={() => {
        quickCreateActive = true;
      }}
      onValueChange={(value) => {
        newTaskTitle = value;
      }}
      onSubmit={createTask}
      onFocusOut={handleQuickCreateFocusOut}
    >
      {#snippet actions()}
        <TaskQuickCreateActions
          dueAt={quickCreateDueAt}
          priority={quickCreatePriority}
          scheduledAt={quickCreateSchedule.scheduledAt}
          when={quickCreateSchedule.when}
          planAt={quickCreateSchedule.planAt}
          onDueAtChange={(value) => {
            quickCreateDueAt = value;
          }}
          onPriorityChange={(value) => {
            quickCreatePriority = value;
          }}
          onScheduleChange={(value) => {
            quickCreateSchedule = value;
          }}
          onInteractionChange={(open) => {
            quickCreateInteractionOpen = open;
          }}
        />
      {/snippet}
    </TaskQuickCreateRow>
  {/if}
</section>
