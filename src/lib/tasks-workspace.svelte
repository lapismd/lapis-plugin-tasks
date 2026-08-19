<script lang="ts">
  import type { App } from "@lapis-notes/api";
  import { onMount } from "svelte";
  import {
    applyCatalogTaskToRepository,
    buildTaskPlannerSnapshotFromRepository,
    createCatalogTaskInRepository,
    deleteCatalogTaskFromRepository,
    replaceListNavChildren,
    toListNavNode,
    uniqueListPath,
    type ListTreeDropTarget,
    type TaskListCreateInput,
    type Task,
    type TaskPlannerSnapshot,
    type TaskQuickCreateInput,
    type TaskRepository,
  } from "./model";
  import TasksPlannerCanvas from "./tasks/application-task-planner-mode/TasksPlannerCanvas.svelte";

  let {
    app,
    repository,
    now,
  }: {
    app: App;
    repository: TaskRepository;
    now?: Date;
  } = $props();

  let tasks = $state<Task[]>([]);
  let snapshot = $state<TaskPlannerSnapshot>({
    inbox: [],
    today: [],
    thisEvening: [],
    upcoming: [],
    upcomingRows: [],
    anytime: [],
    someday: [],
    review: [],
    logbook: [],
    areas: [],
    listTree: { sections: [], unpinned: [], diagnostics: [] },
  });
  let loadError = $state<string | null>(null);
  let refreshQueue = $state(Promise.resolve());

  function isTaskSourcePath(path: string): boolean {
    return path.endsWith(".md") && !path.startsWith(".obsidian/");
  }

  async function refresh() {
    try {
      const nextSnapshot = await buildTaskPlannerSnapshotFromRepository(
        repository,
        now ?? new Date(),
      );
      snapshot = nextSnapshot;
      const seen = new Set<string>();
      const nextTasks: Task[] = [];
      for (const group of [
        nextSnapshot.inbox,
        nextSnapshot.today,
        nextSnapshot.thisEvening,
        nextSnapshot.anytime,
        nextSnapshot.someday,
        nextSnapshot.review,
        ...nextSnapshot.upcoming.map((entry) => entry.tasks),
        ...nextSnapshot.logbook.map((entry) => entry.tasks),
      ]) {
        for (const task of group) {
          if (seen.has(task.id)) continue;
          seen.add(task.id);
          nextTasks.push(task);
        }
      }
      tasks = nextTasks;
      loadError = null;
    } catch (error) {
      loadError = error instanceof Error ? error.message : String(error);
    }
  }

  function queueRefresh() {
    refreshQueue = refreshQueue.then(() => refresh()).catch(() => refresh());
    return refreshQueue;
  }

  async function saveTask(task: Task) {
    const previous = tasks.find((entry) => entry.id === task.id);
    await applyCatalogTaskToRepository(repository, task, previous);
    await queueRefresh();
  }

  async function createTask(input: TaskQuickCreateInput) {
    await createCatalogTaskInRepository(repository, input, {
      existingPaths: app.vault.getMarkdownFiles().map((file) => file.path),
      now: now ?? new Date(),
    });
    await queueRefresh();
  }

  async function deleteTask(task: Task) {
    await deleteCatalogTaskFromRepository(repository, task);
    await queueRefresh();
  }

  async function expandList(id: string) {
    const children = await repository.listChildren(id);
    const counts = new Map(
      snapshot.areas.map((area) => [area.id, area.count] as const),
    );
    snapshot = {
      ...snapshot,
      listTree: replaceListNavChildren(
        snapshot.listTree,
        id,
        children
          .filter((child) => child.status !== "archived")
          .map((child) =>
            toListNavNode(child, counts.get(child.id) ?? 0, [], { parentId: id }),
          ),
      ),
    };
  }

  async function dropList(sourcePath: string, target: ListTreeDropTarget) {
    await repository.applyListTreeDrop(
      sourcePath,
      target,
      (now ?? new Date()).toISOString(),
    );
    await queueRefresh();
  }

  async function renameList(path: string, title: string) {
    await repository.renameList(path, title, (now ?? new Date()).toISOString());
    await queueRefresh();
  }

  async function renameSection(from: string, to: string) {
    await repository.renameNavigationSection(
      from,
      to,
      (now ?? new Date()).toISOString(),
    );
    await queueRefresh();
  }

  async function openNote(path: string) {
    const file = app.vault.getFileByPath(path);
    if (file) await app.openFile(file);
  }

  async function createList(input: TaskListCreateInput) {
    const at = (now ?? new Date()).toISOString();
    const title = "Untitled list";
    const path = uniqueListPath(
      app.vault.getMarkdownFiles().map((file) => file.path),
      title,
    );
    await repository.createList({
      path,
      title,
      at,
      pin:
        input.section && input.section !== "All lists"
          ? { section: input.section }
          : undefined,
    });
    if (input.nestUnderPath) {
      await repository.nestList(path, input.nestUnderPath, at);
    }
    await queueRefresh();
  }

  async function unpinList(path: string) {
    await repository.unpinList(path, (now ?? new Date()).toISOString());
    await queueRefresh();
  }

  async function archiveList(path: string) {
    await repository.archiveList(path, (now ?? new Date()).toISOString());
    await queueRefresh();
  }

  async function deleteList(path: string) {
    await repository.deleteList(path, (now ?? new Date()).toISOString());
    await queueRefresh();
  }

  onMount(() => {
    void queueRefresh();
    const changed = app.metadataCache.on("changed", (file) => {
      if (isTaskSourcePath(file.path)) void queueRefresh();
    });
    const deleted = app.metadataCache.on("deleted", (file) => {
      if (isTaskSourcePath(file.path)) void queueRefresh();
    });
    return () => {
      app.metadataCache.offref(changed);
      app.metadataCache.offref(deleted);
    };
  });
</script>

{#if loadError}
  <div class="tasks-workspace-error" role="alert">{loadError}</div>
{:else}
  <TasksPlannerCanvas
    variant="workspace"
    {tasks}
    {now}
    {snapshot}
    applications={[]}
    applicationSummaries={{}}
    showRelated={false}
    onSaveTask={(task) => void saveTask(task)}
    onCreateTask={(input) => void createTask(input)}
    onDeleteTask={(task) => void deleteTask(task)}
    onExpandList={(id) => void expandList(id)}
    onDropList={(sourcePath, target) => void dropList(sourcePath, target)}
    onRenameList={(path, title) => void renameList(path, title)}
    onRenameSection={(from, to) => void renameSection(from, to)}
    onOpenNote={(path) => void openNote(path)}
    onCreateList={(input) => void createList(input)}
    onUnpinList={(path) => void unpinList(path)}
    onArchiveList={(path) => void archiveList(path)}
    onDeleteList={(path) => void deleteList(path)}
  />
{/if}

<style>
  .tasks-workspace-error {
    margin: 1rem;
    border: 1px solid var(--ui-border, currentColor);
    border-radius: 0.5rem;
    padding: 1rem;
  }
</style>
