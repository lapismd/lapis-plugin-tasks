<script lang="ts">
  import { findOpenFileLeaf, type App } from "@lapis-notes/api";
  import { onMount, untrack } from "svelte";
  import {
    applyCatalogTaskToRepository,
    createAppTaskAgendaRepository,
    buildTaskPlannerSnapshotFromRepository,
    createCatalogTaskInRepository,
    deleteCatalogTaskFromRepository,
    replaceListNavChildren,
    toListNavNode,
    uniqueListPath,
    navigationPinHref,
    todayDateOnly,
    type ListTreeDropTarget,
    type TaskListCreateInput,
    type Task,
    type TaskPlannerSnapshot,
    type TaskQuickCreateInput,
    type TaskRepository,
    type ChecklistItem,
    type StructuralTaskRun,
    type TaskOccurrenceHistoryRow,
  } from "./model";
  import {
    DEFAULT_TASKS_PLUGIN_SETTINGS,
    type TasksPluginSettings,
    type TasksPluginSettingsPatch,
  } from "./tasks-settings";
  import type { TasksSettingsSource } from "./tasks-view";
  import TasksPlannerCanvas from "./tasks/application-task-planner-mode/TasksPlannerCanvas.svelte";
  import { flushTaskFileSurfaces } from "./task-file-surfaces";
  import TaskTrackingCompletionPrompt from "./tasks/task-tracking-completion-prompt/TaskTrackingCompletionPrompt.svelte";

  let {
    app,
    repository,
    clock = () => new Date(),
    settingsSource,
  }: {
    app: App;
    repository: TaskRepository;
    clock?: () => Date;
    settingsSource?: TasksSettingsSource;
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
  let navigationPath = $state<string | null>(null);
  let refreshQueue = $state(Promise.resolve());
  let checklistRefreshVersion = $state(0);
  let settings = $state<TasksPluginSettings>(
    untrack(() => settingsSource?.get() ?? DEFAULT_TASKS_PLUGIN_SETTINGS),
  );
  let pendingTrackingCompletion = $state<Task | null>(null);
  let selectedDate = $state("");
  let historyRows = $state<TaskOccurrenceHistoryRow[]>([]);
  let historyRevision = 0;
  let agendaOrder = $state<string[]>([]);
  let agendaRevision = 0;
  const agenda = $derived(createAppTaskAgendaRepository(app));
  const orderedTasks = $derived(
    tasks.map((task) => ({
      ...task,
      order: agendaOrder.includes(task.id)
        ? agendaOrder.indexOf(task.id) * 1024
        : undefined,
    })),
  );

  async function loadAgenda(date: string) {
    const revision = ++agendaRevision;
    const order = await agenda.order(date);
    if (revision === agendaRevision) agendaOrder = order;
  }
  async function saveAgendaOrder(date: string, ids: string[]) {
    await flushTaskFileSurfaces(app);
    agendaOrder = await agenda.reorder(date, ids);
  }

  const currentTime = () => clock();

  function isTaskSourcePath(path: string): boolean {
    return path.endsWith(".md") && !path.startsWith(".obsidian/");
  }

  async function refresh() {
    try {
      const [nextSnapshot, navigation] = await Promise.all([
        buildTaskPlannerSnapshotFromRepository(repository, currentTime()),
        repository.navigation(),
      ]);
      snapshot = nextSnapshot;
      navigationPath = navigation?.path ?? null;
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

  async function loadHistory(date: string) {
    const revision = ++historyRevision;
    const today = todayDateOnly(currentTime());
    if (!date || date >= today) {
      historyRows = [];
      return;
    }
    const next = await repository.occurrenceHistory(
      date as `${number}-${number}-${number}`,
      date as `${number}-${number}-${number}`,
      today as `${number}-${number}-${number}`,
    );
    if (revision === historyRevision) historyRows = next;
  }

  $effect(() => {
    const date = selectedDate;
    if (date)
      void loadAgenda(date).catch((error) => (loadError = String(error)));
    void loadHistory(date).catch((error) => {
      loadError = error instanceof Error ? error.message : String(error);
    });
  });

  async function saveTask(task: Task) {
    const previous = tasks.find((entry) => entry.id === task.id);
    const completing =
      Boolean(previous) &&
      previous!.status !== "completed" &&
      previous!.status !== "done" &&
      (task.status === "completed" || task.status === "done");
    if (completing && task.tracking && task.tracking.type !== "boolean") {
      pendingTrackingCompletion = task;
      return;
    }
    await flushTaskFileSurfaces(app, task.sourcePath, true);
    await applyCatalogTaskToRepository(repository, task, previous);
    await queueRefresh();
  }

  function cancelTrackingCompletion() {
    pendingTrackingCompletion = null;
    void queueRefresh();
  }

  async function confirmTrackingCompletion(value: number) {
    const task = pendingTrackingCompletion;
    if (!task) return;
    await repository.complete(
      task.sourcePath ?? task.id,
      task.completedAt ?? currentTime().toISOString(),
      value,
    );
    pendingTrackingCompletion = null;
    await queueRefresh();
  }

  async function createTask(input: TaskQuickCreateInput) {
    await createCatalogTaskInRepository(repository, input, {
      existingPaths: app.vault.getMarkdownFiles().map((file) => file.path),
      now: currentTime(),
    });
    await queueRefresh();
  }

  async function createTaskListItem(
    listPath: string,
    section: StructuralTaskRun,
    input: TaskQuickCreateInput,
  ) {
    const task = await createCatalogTaskInRepository(
      repository,
      { ...input, area: null, order: section.entries.length },
      {
        existingPaths: app.vault.getMarkdownFiles().map((file) => file.path),
        now: currentTime(),
      },
    );
    if (!task.sourcePath)
      throw new Error("Created task is missing its vault path.");
    await queueRefresh();
    return {
      label: task.title,
      target: navigationPinHref(listPath, task.sourcePath),
    };
  }

  async function deleteTask(task: Task) {
    await flushTaskFileSurfaces(app);
    await flushTaskFileSurfaces(app, task.sourcePath, true);
    await deleteCatalogTaskFromRepository(repository, task);
    await queueRefresh();
  }

  async function loadChecklist(task: Task): Promise<ChecklistItem[]> {
    const document = await repository.getTaskDocument(
      task.sourcePath ?? task.id,
    );
    return document.checklist;
  }

  async function toggleChecklistItem(
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
    await queueRefresh();
    return document.checklist;
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
            toListNavNode(child, counts.get(child.id) ?? 0, [], {
              parentId: id,
            }),
          ),
      ),
    };
  }

  async function dropList(sourcePath: string, target: ListTreeDropTarget) {
    await repository.applyListTreeDrop(
      sourcePath,
      target,
      currentTime().toISOString(),
    );
    await queueRefresh();
  }

  async function renameList(path: string, title: string) {
    await repository.renameList(path, title, currentTime().toISOString());
    await queueRefresh();
  }

  async function renameSection(from: string, to: string) {
    await repository.renameNavigationSection(
      from,
      to,
      currentTime().toISOString(),
    );
    await queueRefresh();
  }

  async function openNote(path: string) {
    const file = app.vault.getFileByPath(path);
    if (file) await app.openFile(file);
  }

  async function editNavigation() {
    try {
      await flushTaskFileSurfaces(app, undefined, true);
      const navigation = await repository.navigation();
      const file = navigation && app.vault.getFileByPath(navigation.path);
      if (!file)
        throw new Error("The lists navigation document is unavailable.");
      const leaf =
        findOpenFileLeaf(app.workspace, file) ?? app.workspace.getLeaf("tab");
      await leaf.openFile(file, {
        state: {
          type: app.workspace.determineViewTypeForPath(file.path) ?? "markdown",
          state: { file: file.path, mode: "live-preview" },
        },
      });
      app.workspace.activateLeaf(leaf, { operation: "edit-tasks-navigation" });
      await app.workspace.revealLeaf(leaf);
      loadError = null;
    } catch (error) {
      loadError = error instanceof Error ? error.message : String(error);
    }
  }

  async function createList(input: TaskListCreateInput) {
    await flushTaskFileSurfaces(app, undefined, true);
    const at = currentTime().toISOString();
    const title = "Untitled list";
    const path = uniqueListPath(
      app.vault.getMarkdownFiles().map((file) => file.path),
      title,
    );
    await repository.createList({
      path,
      title,
      id: crypto.randomUUID(),
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
    await repository.unpinList(path, currentTime().toISOString());
    await queueRefresh();
  }

  async function archiveList(path: string) {
    await repository.archiveList(path, currentTime().toISOString());
    await queueRefresh();
  }

  async function deleteList(path: string) {
    await repository.deleteList(path, currentTime().toISOString());
    await queueRefresh();
  }

  async function updateSettings(patch: TasksPluginSettingsPatch) {
    await settingsSource?.update(patch);
  }

  onMount(() => {
    repository.invalidateEffectiveOccurrences();
    const unsubscribeEffective = repository.subscribeEffectiveOccurrenceRefresh(
      () => void queueRefresh(),
    );
    void queueRefresh();
    const unsubscribeSettings = settingsSource?.subscribe((nextSettings) => {
      settings = nextSettings;
    });
    const changed = app.metadataCache.on("changed", (file) => {
      if (isTaskSourcePath(file.path)) {
        repository.invalidateEffectiveOccurrences();
        checklistRefreshVersion += 1;
        void queueRefresh();
      }
    });
    const deleted = app.metadataCache.on("deleted", (file) => {
      if (isTaskSourcePath(file.path)) {
        repository.invalidateEffectiveOccurrences();
        void queueRefresh();
      }
    });
    return () => {
      app.metadataCache.offref(changed);
      app.metadataCache.offref(deleted);
      unsubscribeEffective();
      unsubscribeSettings?.();
    };
  });
</script>

{#if loadError}
  <div class="tasks-workspace-error" role="alert">{loadError}</div>
{/if}
<TasksPlannerCanvas
  variant="workspace"
  tasks={orderedTasks}
  onSaveAgendaOrder={saveAgendaOrder}
  {clock}
  {settings}
  {snapshot}
  {app}
  {repository}
  bind:selectedDate
  {historyRows}
  applications={[]}
  applicationSummaries={{}}
  showRelated={false}
  onSaveTask={saveTask}
  onCreateTask={createTask}
  onDeleteTask={deleteTask}
  onLoadChecklist={loadChecklist}
  onToggleChecklistItem={toggleChecklistItem}
  {checklistRefreshVersion}
  onExpandList={(id) => void expandList(id)}
  onDropList={(sourcePath, target) => void dropList(sourcePath, target)}
  onRenameList={(path, title) => void renameList(path, title)}
  onRenameSection={(from, to) => void renameSection(from, to)}
  onOpenNote={(path) => void openNote(path)}
  onEditNavigation={navigationPath ? () => void editNavigation() : undefined}
  onCreateList={(input) => void createList(input)}
  onUnpinList={(path) => void unpinList(path)}
  onArchiveList={(path) => void archiveList(path)}
  onDeleteList={(path) => void deleteList(path)}
  onUpdateSettings={updateSettings}
  onRefreshWorkspace={queueRefresh}
  onCreateTaskListItem={createTaskListItem}
/>

{#if pendingTrackingCompletion}
  <TaskTrackingCompletionPrompt
    task={pendingTrackingCompletion}
    onCancel={cancelTrackingCompletion}
    onConfirm={confirmTrackingCompletion}
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
