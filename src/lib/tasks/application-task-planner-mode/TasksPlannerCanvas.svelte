<script lang="ts">
  import ArchiveIcon from "@lucide/svelte/icons/archive";
  import BookOpenIcon from "@lucide/svelte/icons/book-open";
  import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import CircleEllipsisIcon from "@lucide/svelte/icons/circle-ellipsis";
  import InboxIcon from "@lucide/svelte/icons/inbox";
  import ListTodoIcon from "@lucide/svelte/icons/list-todo";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import * as ColumnCanvas from "@lapismd/design-core/shadcn/column-canvas";
  import type { App } from "@lapis-notes/api";
  import {
    findListNavNode,
    buildTaskPlannerDaySnapshot,
    listTreeFromAreas,
    type JobApplication,
    type ListTreeDropTarget,
    type TaskListCreateInput,
    type Task,
    type TaskBucket,
    type TaskPlannerSnapshot,
    type TaskQuickCreateInput,
    type ChecklistItem,
    type StructuralTaskRunEntryInput,
    type StructuralTaskRun,
    type TaskRepository,
    type TaskOccurrenceHistoryRow,
    todayDateOnly,
  } from "../../model";
  import {
    DEFAULT_TASKS_PLUGIN_SETTINGS,
    type TasksPluginSettings,
    type TasksPluginSettingsPatch,
  } from "../../tasks-settings";
  import ApplicationTaskSidebarDetail from "../application-task-sidebar-detail/ApplicationTaskSidebarDetail.svelte";
  import ApplicationTaskPlannerMode from "./ApplicationTaskPlannerMode.svelte";
  import TaskListNavTree from "./TaskListNavTree.svelte";
  import TaskMarkdownSurface from "../../task-list-markdown-surface/TaskListMarkdownSurface.svelte";
  import TaskTodayActionsMenu from "../task-planner/TaskTodayActionsMenu.svelte";
  import type { TasksMarkdownSurfaceController } from "../../task-list-surface";
  import {
    appendDetailColumn,
    unwindDetailColumns,
  } from "./detail-column-stack";
  import "./ApplicationTaskPlannerColumnCanvasStory.css";

  type ApplicationSummary = {
    title: string;
    subtitle?: string;
    color?: string;
  };

  type MarkdownSurfaceHandle = {
    enter: () => void;
    exit: () => Promise<boolean>;
  };

  type DetailColumnEntry = {
    columnId: string;
    key: string;
    kind: "task" | "list";
    taskId?: string;
    path?: string;
    title?: string;
    editing: boolean;
    sourceOrdinal: number | null;
    selectedListPath: string | null;
    surface: MarkdownSurfaceHandle | null;
  };

  let {
    tasks,
    now,
    clock = () => now ?? new Date(),
    settings = DEFAULT_TASKS_PLUGIN_SETTINGS,
    snapshot,
    applications = [],
    applicationSummaries = {},
    showRelated = false,
    variant = "story",
    onSaveTask,
    onCreateTask,
    onDeleteTask,
    onLoadChecklist,
    onToggleChecklistItem,
    checklistRefreshVersion = 0,
    onSaveApplication = () => {},
    onOpenApplication = () => {},
    onExpandList,
    onDropList,
    onRenameList,
    onRenameSection,
    onOpenNote,
    onCreateList,
    onUnpinList,
    onArchiveList,
    onDeleteList,
    onUpdateSettings = () => {},
    app,
    repository,
    onRefreshWorkspace,
    onCreateTaskListItem,
    selectedDate = $bindable(""),
    historyRows = [],
  }: {
    tasks: Task[];
    now?: Date;
    clock?: () => Date;
    settings?: TasksPluginSettings;
    snapshot: TaskPlannerSnapshot;
    applications?: JobApplication[];
    applicationSummaries?: Record<string, ApplicationSummary>;
    showRelated?: boolean;
    variant?: "story" | "workspace";
    onSaveTask: (task: Task) => void | Promise<void>;
    onCreateTask: (input: TaskQuickCreateInput) => void;
    onDeleteTask: (task: Task) => void;
    onLoadChecklist?: (task: Task) => Promise<ChecklistItem[]>;
    onToggleChecklistItem?: (
      task: Task,
      item: ChecklistItem,
      checked: boolean,
    ) => Promise<ChecklistItem[]>;
    checklistRefreshVersion?: number;
    onSaveApplication?: (application: JobApplication) => void;
    onOpenApplication?: (applicationId: string) => void;
    onExpandList?: (id: string) => void;
    onDropList?: (sourcePath: string, target: ListTreeDropTarget) => void;
    onRenameList?: (path: string, title: string) => void;
    onRenameSection?: (from: string, to: string) => void;
    onOpenNote?: (path: string) => void;
    onCreateList?: (input: TaskListCreateInput) => void;
    onUnpinList?: (path: string) => void;
    onArchiveList?: (path: string) => void;
    onDeleteList?: (path: string) => void;
    onUpdateSettings?: (patch: TasksPluginSettingsPatch) => void | Promise<void>;
    app?: App;
    repository?: TaskRepository;
    onRefreshWorkspace?: () => void | Promise<void>;
    selectedDate?: string;
    historyRows?: TaskOccurrenceHistoryRow[];
    onCreateTaskListItem?: (
      listPath: string,
      section: StructuralTaskRun,
      input: TaskQuickCreateInput,
    ) =>
      | StructuralTaskRunEntryInput
      | void
      | Promise<StructuralTaskRunEntryInput | void>;
  } = $props();

  const listTree = $derived(
    snapshot.listTree ?? listTreeFromAreas(snapshot.areas),
  );

  const plannerBuckets = [
    { id: "inbox", label: "Inbox", icon: InboxIcon },
    { id: "today", label: "Today", icon: ListTodoIcon },
    { id: "review", label: "Review", icon: CircleAlertIcon },
    { id: "upcoming", label: "Upcoming", icon: CalendarDaysIcon },
    { id: "anytime", label: "Anytime", icon: CircleEllipsisIcon },
    { id: "someday", label: "Someday", icon: CalendarClockIcon },
    { id: "logbook", label: "Logbook", icon: ArchiveIcon },
  ] satisfies Array<{
    id: TaskBucket;
    label: string;
    icon: typeof ListTodoIcon;
  }>;

  const plannerBucketIds = new Set<string>(
    plannerBuckets.map((bucket) => bucket.id),
  );

  const canvas = ColumnCanvas.createColumnCanvasController({
    columns: {
      tasks: {
        defaultWidth: 196,
        minWidth: 180,
        maxWidth: 280,
        pathLevel: 0,
        collapsible: true,
        resizable: true,
      },
      planner: {
        defaultWidth: 540,
        minWidth: 360,
        maxWidth: null,
        pathLevel: 1,
        collapsible: true,
        resizable: true,
      },
      detail: {
        defaultWidth: 360,
        minWidth: 300,
        maxWidth: null,
        pathLevel: 2,
        closeable: true,
        resizable: true,
      },
      related: {
        defaultWidth: 340,
        minWidth: 280,
        maxWidth: null,
        pathLevel: 3,
        closeable: true,
        closed: true,
        resizable: true,
      },
    },
    initialPath: ["today"],
  });

  let taskView = $state<TaskBucket>("today");
  let taskArea = $state<string | null>(null);
  const activePlannerBucket = $derived(
    taskArea
      ? null
      : (plannerBuckets.find((bucket) => bucket.id === taskView) ?? null),
  );
  let detailColumns = $state<DetailColumnEntry[]>([]);
  let plannerSelectedListPath = $state<string | null>(null);
  const detailSurfaceControllers = new Map<
    string,
    { key: string; controller: TasksMarkdownSurfaceController }
  >();
  let activeDropTargetId = $state<string | null>(null);
  let taskListEditing = $state(false);
  let taskListSourceOrdinal = $state<number | null>(null);
  let taskListSurface = $state<{
    enter: () => void;
    exit: () => Promise<boolean>;
  } | null>(null);
  let hideCompletedTasks = $state(false);
  let markAllIncompletePending = $state(false);
  let previousTaskArea: string | null | undefined;
  let relatedApplicationId = $state<string | null>(null);

  const activePlannerLabel = $derived(
    taskArea
      ? (findListNavNode(listTree, taskArea)?.title ??
        snapshot.areas.find((area) => area.id === taskArea)?.title ??
        taskArea)
      : (plannerBuckets.find((bucket) => bucket.id === taskView)?.label ??
        "Today"),
  );
  const selectedListNode = $derived(
    taskArea ? findListNavNode(listTree, taskArea) : null,
  );
  const actualToday = $derived(todayDateOnly(now ?? clock()));

  $effect(() => {
    const nextTaskArea = taskArea;
    if (nextTaskArea === previousTaskArea) return;
    previousTaskArea = nextTaskArea;
    taskListEditing = false;
    taskListSourceOrdinal = null;
  });

  $effect.pre(() => {
    if (!selectedDate) selectedDate = actualToday;
  });
  const showTodayShortcut = $derived(
    taskView === "today" && selectedDate !== actualToday,
  );
  const selectedDaySnapshot = $derived(
    buildTaskPlannerDaySnapshot(
      tasks,
      selectedDate || actualToday,
      settings,
      actualToday,
    ),
  );
  const actualTodaySnapshot = $derived(
    buildTaskPlannerDaySnapshot(tasks, actualToday, settings, actualToday),
  );
  const plannerActiveTaskId = $derived(
    detailColumns[0]?.kind === "task" ? (detailColumns[0].taskId ?? null) : null,
  );
  const relatedApplication = $derived.by(() => {
    if (!showRelated) return null;
    if (!relatedApplicationId) return null;
    return applications.find(
      (application) => application.id === relatedApplicationId,
    ) ?? null;
  });

  function isBucket(id: string): id is TaskBucket {
    return plannerBucketIds.has(id);
  }

  function showNav(id: string) {
    if (isBucket(id)) {
      taskView = id;
      taskArea = null;
    } else {
      taskArea = id;
    }
    detailColumns = [];
    plannerSelectedListPath = null;
    relatedApplicationId = null;
    if (!canvas.isSelected(0, id)) {
      canvas.select(0, id);
      return;
    }
    canvas.clearFrom(1);
  }

  function detailColumnId(index: number): string {
    return index === 0 ? "detail" : `detail-${index + 1}`;
  }

  function detailColumnTitle(entry: DetailColumnEntry): string {
    if (entry.kind === "list") return entry.title ?? entry.path ?? "List";
    return (
      tasks.find((task) => task.id === entry.taskId)?.title ??
      entry.taskId ??
      "Task"
    );
  }

  function childEntry(sourceIndex: number): DetailColumnEntry | null {
    return detailColumns[sourceIndex + 1] ?? null;
  }

  function activeTaskIdFor(sourceIndex: number): string | null {
    const child = childEntry(sourceIndex);
    return child?.kind === "task" ? (child.taskId ?? null) : null;
  }

  function activeListPathFor(sourceIndex: number): string | null {
    if (sourceIndex < 0) return plannerSelectedListPath;
    return detailColumns[sourceIndex]?.selectedListPath ?? null;
  }

  function setSelectedListPath(sourceIndex: number, path: string | null) {
    if (sourceIndex < 0) {
      plannerSelectedListPath = path;
      return;
    }
    const source = detailColumns[sourceIndex];
    if (source) source.selectedListPath = path;
  }

  async function exitDetailEditorsFrom(startIndex: number): Promise<boolean> {
    for (let index = detailColumns.length - 1; index >= startIndex; index -= 1) {
      const entry = detailColumns[index];
      if (entry.editing && entry.surface && !(await entry.surface.exit())) {
        return false;
      }
    }
    return true;
  }

  function createDetailEntry(
    index: number,
    target:
      | { kind: "task"; taskId: string }
      | { kind: "list"; path: string; title: string },
  ): DetailColumnEntry {
    return {
      columnId: detailColumnId(index),
      key:
        target.kind === "task"
          ? `task:${target.taskId}`
          : `list:${target.path}`,
      kind: target.kind,
      ...(target.kind === "task"
        ? { taskId: target.taskId }
        : { path: target.path, title: target.title }),
      editing: false,
      sourceOrdinal: null,
      selectedListPath: null,
      surface: null,
    };
  }

  async function openDetail(
    sourceIndex: number,
    target:
      | { kind: "task"; taskId: string }
      | { kind: "list"; path: string; title: string },
  ): Promise<void> {
    const targetIndex = sourceIndex + 1;
    if (!(await exitDetailEditorsFrom(targetIndex))) return;

    const nextEntry = createDetailEntry(targetIndex, target);
    const current = detailColumns[targetIndex];
    const entry = current?.key === nextEntry.key ? current : nextEntry;
    const columnId = detailColumnId(targetIndex);
    canvas.ensureColumn(columnId, {
      defaultWidth: 360,
      minWidth: 300,
      maxWidth: null,
      pathLevel: targetIndex + 2,
      closeable: true,
      resizable: true,
    });
    detailColumns = appendDetailColumn(detailColumns, sourceIndex, entry);
    relatedApplicationId = null;

    const selectionLevel = targetIndex + 1;
    if (canvas.pathAt(selectionLevel) === entry.key) {
      canvas.clearFrom(selectionLevel + 1);
      canvas.open(columnId);
      return;
    }
    canvas.select(selectionLevel, entry.key);
  }

  async function handleActiveTaskChange(
    sourceIndex: number,
    taskId: string | null,
  ) {
    if (taskId) {
      setSelectedListPath(sourceIndex, null);
      await openDetail(sourceIndex, { kind: "task", taskId });
      return;
    }
    await closeDetailColumn(sourceIndex + 1);
  }

  async function closeDetailColumn(index: number): Promise<boolean> {
    const entry = detailColumns[index];
    if (!entry) return true;
    if (!(await exitDetailEditorsFrom(index))) {
      canvas.open(entry.columnId);
      return false;
    }
    detailColumns = unwindDetailColumns(detailColumns, index);
    setSelectedListPath(index - 1, null);
    relatedApplicationId = null;
    canvas.clearFrom(index + 1);
    return true;
  }

  function handleActiveListChange(sourceIndex: number, path: string | null) {
    setSelectedListPath(sourceIndex, path);
  }

  async function handleOpenList(
    sourceIndex: number,
    path: string,
    title: string,
  ) {
    setSelectedListPath(sourceIndex, path);
    await openDetail(sourceIndex, { kind: "list", path, title });
  }

  async function deleteLinkedList(path: string, parentPath: string) {
    if (!repository) return;
    const openIndex = detailColumns.findIndex(
      (entry) => entry.kind === "list" && entry.path === path,
    );
    if (openIndex >= 0 && !(await closeDetailColumn(openIndex))) return;
    await repository.deleteList(path, (now ?? clock()).toISOString(), {
      skipParentPaths: [parentPath],
    });
    if (plannerSelectedListPath === path) plannerSelectedListPath = null;
    for (const entry of detailColumns) {
      if (entry.selectedListPath === path) entry.selectedListPath = null;
    }
    await onRefreshWorkspace?.();
  }

  async function handleOpenApplication(
    applicationId: string,
    sourceIndex = -1,
  ) {
    if (!showRelated) {
      onOpenApplication(applicationId);
      return;
    }
    let ownerIndex = sourceIndex;
    if (ownerIndex < 0) {
      const ownerId =
        tasks.find((task) => task.applicationId === applicationId)?.id ?? null;
      if (ownerId) {
        await handleActiveTaskChange(-1, ownerId);
        ownerIndex = 0;
      }
    }
    if (!(await exitDetailEditorsFrom(ownerIndex + 1))) return;
    detailColumns = unwindDetailColumns(detailColumns, ownerIndex + 1);
    relatedApplicationId = applicationId;
    canvas.ensureColumn("related", {
      defaultWidth: 340,
      minWidth: 280,
      maxWidth: null,
      pathLevel: ownerIndex + 3,
      closeable: true,
      resizable: true,
    });
    const selectionLevel = ownerIndex + 2;
    if (canvas.pathAt(selectionLevel) === `application:${applicationId}`) {
      canvas.open("related");
      return;
    }
    canvas.select(selectionLevel, `application:${applicationId}`);
    onOpenApplication(applicationId);
  }

  function updateActiveTaskTitle(task: Task, title: string) {
    onSaveTask({
      ...task,
      title,
      updatedAt: (now ?? clock()).toISOString(),
    });
  }

  function toggleActiveTaskDone(task: Task) {
    const done = task.status !== "done" && task.status !== "completed";
    onSaveTask({
      ...task,
      status: done ? "completed" : "open",
      completedAt: done ? (task.completedAt ?? (now ?? clock()).toISOString()) : undefined,
      updatedAt: (now ?? clock()).toISOString(),
    });
  }

  async function markAllTodayTasksIncomplete() {
    if (markAllIncompletePending) return;
    const completedTasks = [...selectedDaySnapshot.done];
    if (!completedTasks.length) return;
    markAllIncompletePending = true;
    try {
      for (const task of completedTasks) {
        await onSaveTask({
          ...task,
          status: "open",
          completedAt: undefined,
          updatedAt: (now ?? clock()).toISOString(),
        });
      }
    } finally {
      markAllIncompletePending = false;
    }
  }

  async function setHideOverdueTasks(hideOverdueTasks: boolean) {
    await onUpdateSettings({ dailyAgenda: { hideOverdueTasks } });
  }

  function removeActiveTask(task: Task, detailIndex: number) {
    onDeleteTask(task);
    void closeDetailColumn(detailIndex);
  }

  async function moveStructuralEntry(
    source: { documentPath: string; runId: string; index: number },
    target: { run: StructuralTaskRun; index: number },
  ) {
    if (!repository) return;
    const sourceRun = (await repository.getStructuralTaskRuns(
      source.documentPath,
    )).find((run) => run.id === source.runId);
    const targetRun = (await repository.getStructuralTaskRuns(
      target.run.documentPath,
    )).find((run) => run.id === target.run.id);
    if (!sourceRun || !targetRun) {
      throw new Error("The task run changed before the move could be saved.");
    }
    await repository.moveStructuralEntry(
      source.documentPath,
      sourceRun,
      source.index,
      target.run.documentPath,
      targetRun,
      target.index,
    );
    await onRefreshWorkspace?.();
  }

  const listSurfaceController: TasksMarkdownSurfaceController = {
    kind: "tasks-markdown",
    get tasks() {
      return tasks;
    },
    get activeTaskId() {
      return activeTaskIdFor(-1);
    },
    get activeListPath() {
      return activeListPathFor(-1);
    },
    get pageTitle() {
      return activePlannerLabel;
    },
    hideMatchingDocumentTitle: true,
    onActiveTaskChange: (taskId) => handleActiveTaskChange(-1, taskId),
    onActiveListChange: (path) => handleActiveListChange(-1, path),
    onOpenList: (path, title) => handleOpenList(-1, path, title),
    onSaveTask: (task) => onSaveTask(task),
    onDeleteTask: (task) => onDeleteTask(task),
    onDeleteList: deleteLinkedList,
    onRefresh: () => onRefreshWorkspace?.(),
    onOpenNote: (path) => onOpenNote?.(path),
    get sourceRunOrdinal() {
      return taskListSourceOrdinal;
    },
    onRevealSource: (section) => {
      taskListSourceOrdinal = section.ordinal;
      taskListSurface?.enter();
    },
    onCreateInSection: (section, input) => {
      return onCreateTaskListItem?.(section.documentPath, section, input);
    },
    onReorderSection: async (section, entries) => {
      if (!repository) return;
      await repository.replaceStructuralTaskRun(
        section.documentPath,
        section,
        entries,
      );
      await onRefreshWorkspace?.();
    },
    onMoveEntry: moveStructuralEntry,
  };

  function detailSurfaceController(
    entry: DetailColumnEntry,
  ): TasksMarkdownSurfaceController {
    const cached = detailSurfaceControllers.get(entry.columnId);
    if (cached?.key === entry.key) return cached.controller;

    const sourceIndex = () =>
      detailColumns.findIndex(
        (candidate) => candidate.columnId === entry.columnId,
      );
    const controller: TasksMarkdownSurfaceController = {
      kind: "tasks-markdown",
      get tasks() {
        return tasks;
      },
      get activeTaskId() {
        return activeTaskIdFor(sourceIndex());
      },
      get activeListPath() {
        return activeListPathFor(sourceIndex());
      },
      get pageTitle() {
        return detailColumnTitle(entry);
      },
      hideMatchingDocumentTitle: true,
      onActiveTaskChange: (taskId) =>
        handleActiveTaskChange(sourceIndex(), taskId),
      onActiveListChange: (path) =>
        handleActiveListChange(sourceIndex(), path),
      onOpenList: (path, title) =>
        handleOpenList(sourceIndex(), path, title),
      onSaveTask: (task) => onSaveTask(task),
      onDeleteTask: async (task) => {
        onDeleteTask(task);
        const child = childEntry(sourceIndex());
        if (child?.kind === "task" && child.taskId === task.id) {
          await closeDetailColumn(sourceIndex() + 1);
        }
      },
      onDeleteList: deleteLinkedList,
      onRefresh: () => onRefreshWorkspace?.(),
      onOpenNote: (path) => onOpenNote?.(path),
      get sourceRunOrdinal() {
        return entry.sourceOrdinal;
      },
      onRevealSource: (run) => {
        entry.sourceOrdinal = run.ordinal;
        entry.surface?.enter();
      },
      onCreateInSection: (run, input) => {
        return onCreateTaskListItem?.(run.documentPath, run, input);
      },
      onReorderSection: async (run, entries) => {
        if (!repository) return;
        await repository.replaceStructuralTaskRun(
          run.documentPath,
          run,
          entries,
        );
        await onRefreshWorkspace?.();
      },
      onMoveEntry: moveStructuralEntry,
    };
    detailSurfaceControllers.set(entry.columnId, {
      key: entry.key,
      controller,
    });
    return controller;
  }

  function editTaskListDocument() {
    taskListSourceOrdinal = null;
    taskListSurface?.enter();
  }

  async function readTaskListDocument() {
    if (await taskListSurface?.exit()) taskListSourceOrdinal = null;
  }

  function editDetailDocument(entry: DetailColumnEntry) {
    entry.sourceOrdinal = null;
    entry.surface?.enter();
  }

  async function readDetailDocument(entry: DetailColumnEntry) {
    if (await entry.surface?.exit()) entry.sourceOrdinal = null;
  }

  function bucketCount(bucket: TaskBucket) {
    if (bucket === "inbox") return snapshot.inbox.length;
    if (bucket === "today") {
      return (
        actualTodaySnapshot.anytime.length +
        actualTodaySnapshot.morning.length +
        actualTodaySnapshot.afternoon.length +
        actualTodaySnapshot.evening.length
      );
    }
    if (bucket === "review") return snapshot.review.length;
    if (bucket === "upcoming") {
      return snapshot.upcoming.reduce(
        (total, group) => total + group.tasks.length,
        0,
      );
    }
    if (bucket === "anytime") return snapshot.anytime.length;
    if (bucket === "someday") return snapshot.someday.length;
    return snapshot.logbook.reduce(
      (total, group) => total + group.tasks.length,
      0,
    );
  }
</script>

<div
  class="task-column-canvas-story"
  class:task-column-canvas-story--workspace={variant === "workspace"}
  data-testid="tasks-planner"
>
  <div
    class="task-column-canvas-story__canvas"
    data-task-planner-column-canvas
  >
    <ColumnCanvas.Root controller={canvas} aria-label="Task planner">
      <ColumnCanvas.Column
        id="tasks"
        title="Tasks"
        count={tasks.length}
        sticky
      >
        {#snippet stickyRail()}
          <ListTodoIcon aria-hidden="true" />
        {/snippet}
        <ColumnCanvas.Body>
          <nav
            class="task-column-canvas-story__nav"
            aria-label="Planner menu"
            data-planner-menu-dragging={activeDropTargetId !== null || undefined}
          >
            <p class="task-column-canvas-story__section-label">Planner</p>
            {#each plannerBuckets as bucket (bucket.id)}
              {@const dropId = `planner-sidebar:${bucket.id}`}
              <div
                class="task-column-canvas-story__nav-drop"
                class:task-column-canvas-story__nav-drop--active={activeDropTargetId ===
                  dropId}
                data-planner-drop-id={dropId}
                data-planner-drop-mode="valid"
                data-planner-drop-active={activeDropTargetId === dropId ||
                  undefined}
                data-planner-drop-data={JSON.stringify({
                  type: "planner-sidebar-bucket",
                  bucket: bucket.id,
                })}
              >
                <ColumnCanvas.Item
                  aria-label={bucket.label}
                  selected={canvas.isSelected(0, bucket.id)}
                  onclick={() => showNav(bucket.id)}
                >
                  <span class="task-column-canvas-story__nav-item">
                    <bucket.icon aria-hidden="true" />
                    <span>{bucket.label}</span>
                    <small>{bucketCount(bucket.id)}</small>
                  </span>
                </ColumnCanvas.Item>
              </div>
            {/each}

            <TaskListNavTree
              tree={listTree}
              selectedId={taskArea}
              isSelected={(id) => canvas.isSelected(0, id)}
              {activeDropTargetId}
              onSelect={showNav}
              onExpand={onExpandList}
              onDrop={onDropList}
              {onRenameList}
              {onRenameSection}
              {onOpenNote}
              {onCreateList}
              {onUnpinList}
              {onArchiveList}
              {onDeleteList}
            />
          </nav>
        </ColumnCanvas.Body>
      </ColumnCanvas.Column>

      <ColumnCanvas.Column id="planner" aria-label={activePlannerLabel}>
        <ColumnCanvas.Header>
          <div
            data-ui-component="column-canvas"
            data-ui-part="column-header-main"
          >
            <ColumnCanvas.Title>
              <span class="task-column-canvas-story__planner-title">
                {#if activePlannerBucket}
                  <activePlannerBucket.icon aria-hidden="true" />
                {/if}
                <span>{activePlannerLabel}</span>
              </span>
            </ColumnCanvas.Title>
          </div>
          <ColumnCanvas.HeaderActions>
            {#if showTodayShortcut}
              <button
                type="button"
                class="task-column-canvas-story__today-shortcut"
                aria-label="Return to today"
                onclick={() => (selectedDate = actualToday)}
              >
                <CalendarDaysIcon aria-hidden="true" />
                <span>Today</span>
              </button>
            {/if}
            {#if taskView === "today" && !taskArea}
              <TaskTodayActionsMenu
                {hideCompletedTasks}
                hideOverdueTasks={settings.dailyAgenda.hideOverdueTasks}
                completedTaskCount={selectedDaySnapshot.done.length}
                {markAllIncompletePending}
                onHideCompletedTasksChange={(hidden) =>
                  (hideCompletedTasks = hidden)}
                onHideOverdueTasksChange={setHideOverdueTasks}
                onMarkAllIncomplete={markAllTodayTasksIncomplete}
              />
            {/if}
            {#if taskArea && selectedListNode && app && repository}
              <button
                type="button"
                class="task-column-canvas-story__markdown-mode"
                aria-label={taskListEditing
                  ? `Read ${activePlannerLabel}`
                  : `Edit ${activePlannerLabel}`}
                title={taskListEditing ? "Reading view" : "Edit"}
                onclick={() =>
                  taskListEditing
                    ? void readTaskListDocument()
                    : editTaskListDocument()}
              >
                {#if taskListEditing}
                  <BookOpenIcon aria-hidden="true" />
                {:else}
                  <PencilIcon aria-hidden="true" />
                {/if}
              </button>
            {/if}
            <ColumnCanvas.Toggle />
          </ColumnCanvas.HeaderActions>
        </ColumnCanvas.Header>
        <div class="task-column-canvas-story__pane">
          {#if taskArea && selectedListNode && app && repository}
            <TaskMarkdownSurface
              bind:this={taskListSurface}
              bind:editing={taskListEditing}
              {app}
              {repository}
              path={selectedListNode.path}
              controller={listSurfaceController}
            />
          {:else}
            <ApplicationTaskPlannerMode
            {tasks}
            {now}
            {clock}
            {settings}
            {hideCompletedTasks}
            bind:selectedDate
            {historyRows}
            {applications}
            view={taskView}
            area={taskArea}
            activeTaskId={plannerActiveTaskId}
            detailsPresentation="external"
            taskAreas={snapshot.areas}
            {applicationSummaries}
            onActiveTaskChange={(taskId) =>
              void handleActiveTaskChange(-1, taskId)}
            {onSaveTask}
            {onCreateTask}
            {onDeleteTask}
            {onLoadChecklist}
            {onToggleChecklistItem}
            {checklistRefreshVersion}
            {onSaveApplication}
            onOpenApplication={(applicationId) =>
              void handleOpenApplication(applicationId, -1)}
            onDragTargetChange={(targetId) => (activeDropTargetId = targetId)}
            />
          {/if}
        </div>
      </ColumnCanvas.Column>

      {#each detailColumns as detail, detailIndex (detail.columnId)}
        {@const detailTitle = detailColumnTitle(detail)}
        {@const detailTask =
          detail.kind === "task"
            ? (tasks.find((task) => task.id === detail.taskId) ?? null)
            : null}
        {@const surfaceController = detailSurfaceController(detail)}
        <ColumnCanvas.Column
          id={detail.columnId}
          class={detail.kind === "list"
            ? "task-column-canvas-story__linked-list-column"
            : undefined}
        >
          {#if detail.kind === "list" && app && repository && detail.path}
            <ColumnCanvas.Header>
              <div
                data-ui-component="column-canvas"
                data-ui-part="column-header-main"
              >
                <ColumnCanvas.Title>{detailTitle}</ColumnCanvas.Title>
              </div>
              <ColumnCanvas.HeaderActions>
                <button
                  type="button"
                  class="task-column-canvas-story__markdown-mode"
                  aria-label={detail.editing
                    ? `Read ${detailTitle}`
                    : `Edit ${detailTitle}`}
                  title={detail.editing ? "Reading view" : "Edit"}
                  onclick={() =>
                    detail.editing
                      ? void readDetailDocument(detail)
                      : editDetailDocument(detail)}
                >
                  {#if detail.editing}
                    <BookOpenIcon aria-hidden="true" />
                  {:else}
                    <PencilIcon aria-hidden="true" />
                  {/if}
                </button>
                <ColumnCanvas.Close
                  onclick={() => void closeDetailColumn(detailIndex)}
                />
              </ColumnCanvas.HeaderActions>
            </ColumnCanvas.Header>
            <div class="task-column-canvas-story__pane">
              <TaskMarkdownSurface
                bind:this={detail.surface}
                bind:editing={detail.editing}
                {app}
                {repository}
                path={detail.path}
                controller={surfaceController}
              />
            </div>
          {:else if detailTask}
            {@const detailApplication = detailTask.applicationId
              ? (applicationSummaries[detailTask.applicationId] ?? null)
              : null}
            <ApplicationTaskSidebarDetail
              task={detailTask}
              application={detailApplication}
              documentBodyEnabled={Boolean(
                app && repository && detailTask.sourcePath,
              )}
              onToggleDone={toggleActiveTaskDone}
              onUpdateTitle={updateActiveTaskTitle}
              onRemoveTask={(task) => removeActiveTask(task, detailIndex)}
              onOpenApplication={(applicationId) =>
                void handleOpenApplication(applicationId, detailIndex)}
            >
              {#snippet closeAction()}
                <ColumnCanvas.Close
                  onclick={() => void closeDetailColumn(detailIndex)}
                />
              {/snippet}
              {#snippet documentModeAction()}
                {#if app && repository && detailTask.sourcePath}
                  <button
                    type="button"
                    class="task-column-canvas-story__markdown-mode"
                    aria-label={detail.editing
                      ? `Read ${detailTitle}`
                      : `Edit ${detailTitle}`}
                    title={detail.editing ? "Reading view" : "Edit"}
                    onclick={() =>
                      detail.editing
                        ? void readDetailDocument(detail)
                        : editDetailDocument(detail)}
                  >
                    {#if detail.editing}
                      <BookOpenIcon aria-hidden="true" />
                    {:else}
                      <PencilIcon aria-hidden="true" />
                    {/if}
                  </button>
                {/if}
              {/snippet}
              {#snippet documentBody()}
                {#if app && repository && detailTask.sourcePath}
                  <TaskMarkdownSurface
                    bind:this={detail.surface}
                    bind:editing={detail.editing}
                    {app}
                    {repository}
                    path={detailTask.sourcePath}
                    controller={surfaceController}
                  />
                {/if}
              {/snippet}
            </ApplicationTaskSidebarDetail>
          {:else}
            <div class="task-column-canvas-story__related-empty">
              <ColumnCanvas.Close
                onclick={() => void closeDetailColumn(detailIndex)}
              />
              <p>The selected Task is no longer available.</p>
            </div>
          {/if}
        </ColumnCanvas.Column>
      {/each}

      {#if showRelated}
        <ColumnCanvas.Column
          id="related"
          title={relatedApplication?.company ?? "Related"}
        >
          <ColumnCanvas.Body>
            {#if relatedApplication}
              <div class="task-column-canvas-story__related">
                <h2>{relatedApplication.company}</h2>
                <p>{relatedApplication.role}</p>
                {#if relatedApplication.location}
                  <p>{relatedApplication.location}</p>
                {/if}
                {#if relatedApplication.notes}
                  <p>{relatedApplication.notes}</p>
                {/if}
              </div>
            {:else}
              <p class="task-column-canvas-story__related-empty">
                Open a linked application from the task detail.
              </p>
            {/if}
          </ColumnCanvas.Body>
        </ColumnCanvas.Column>
      {/if}
    </ColumnCanvas.Root>
  </div>
</div>
