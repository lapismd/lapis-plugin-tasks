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
    todayDateOnly,
  } from "../../model";
  import {
    DEFAULT_TASKS_PLUGIN_SETTINGS,
    type TasksPluginSettings,
  } from "../../tasks-settings";
  import ApplicationTaskSidebarDetail from "../application-task-sidebar-detail/ApplicationTaskSidebarDetail.svelte";
  import ApplicationTaskPlannerMode from "./ApplicationTaskPlannerMode.svelte";
  import TaskListNavTree from "./TaskListNavTree.svelte";
  import TaskMarkdownSurface from "../../task-list-markdown-surface/TaskListMarkdownSurface.svelte";
  import type { TasksMarkdownSurfaceController } from "../../task-list-surface";
  import "./ApplicationTaskPlannerColumnCanvasStory.css";

  type ApplicationSummary = {
    title: string;
    subtitle?: string;
    color?: string;
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
    app,
    repository,
    onRefreshWorkspace,
    onCreateTaskListItem,
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
    onSaveTask: (task: Task) => void;
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
    app?: App;
    repository?: TaskRepository;
    onRefreshWorkspace?: () => void | Promise<void>;
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
        maxWidth: 720,
        pathLevel: 1,
        collapsible: true,
        resizable: true,
      },
      detail: {
        defaultWidth: 360,
        minWidth: 300,
        maxWidth: 520,
        pathLevel: 2,
        closeable: true,
        resizable: true,
      },
      related: {
        defaultWidth: 340,
        minWidth: 280,
        maxWidth: 480,
        pathLevel: 3,
        closeable: true,
        resizable: true,
      },
    },
    initialPath: ["today"],
  });

  let taskView = $state<TaskBucket>("today");
  let selectedDate = $state("");
  let taskArea = $state<string | null>(null);
  let activeTaskId = $state<string | null>(null);
  let activeListPath = $state<string | null>(null);
  let activeLinkedList = $state<{ path: string; title: string } | null>(null);
  let activeDropTargetId = $state<string | null>(null);
  let taskListEditing = $state(false);
  let taskListSourceOrdinal = $state<number | null>(null);
  let taskListSurface = $state<{
    enter: () => void;
    exit: () => Promise<boolean>;
  } | null>(null);
  let linkedListEditing = $state(false);
  let linkedListSourceOrdinal = $state<number | null>(null);
  let linkedListSurface = $state<{
    enter: () => void;
    exit: () => Promise<boolean>;
  } | null>(null);
  let taskDocumentEditing = $state(false);
  let taskDocumentSourceOrdinal = $state<number | null>(null);
  let taskDocumentSurface = $state<{
    enter: () => void;
    exit: () => Promise<boolean>;
  } | null>(null);
  let previousTaskArea: string | null | undefined;

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

  $effect(() => {
    activeTaskId;
    taskDocumentEditing = false;
    taskDocumentSourceOrdinal = null;
  });

  $effect.pre(() => {
    if (!selectedDate) selectedDate = actualToday;
  });
  const showTodayShortcut = $derived(
    taskView === "today" && selectedDate !== actualToday,
  );
  const activeTask = $derived(
    activeTaskId
      ? (tasks.find((task) => task.id === activeTaskId) ?? null)
      : null,
  );
  const activeTaskApplication = $derived(
    activeTask?.applicationId
      ? (applicationSummaries[activeTask.applicationId] ?? null)
      : null,
  );
  const relatedApplication = $derived.by(() => {
    if (!showRelated) return null;
    const relatedId = canvas.pathAt(2);
    if (!relatedId) return null;
    return applications.find((application) => application.id === relatedId) ??
      null;
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
    activeTaskId = null;
    activeListPath = null;
    activeLinkedList = null;
    if (!canvas.isSelected(0, id)) {
      canvas.select(0, id);
      return;
    }
    canvas.clearFrom(1);
  }

  function handleActiveTaskChange(taskId: string | null) {
    if (taskId) {
      activeListPath = null;
      activeLinkedList = null;
      activeTaskId = taskId;
      if (canvas.pathAt(1) === taskId) {
        canvas.open("detail");
        return;
      }
      canvas.select(1, taskId);
      return;
    }
    activeTaskId = null;
    canvas.close("detail");
    if (canvas.pathAt(1)) canvas.clearFrom(1);
  }

  async function closeDetailColumn(): Promise<boolean> {
    if (
      activeLinkedList &&
      linkedListSurface &&
      !(await linkedListSurface.exit())
    ) {
      return false;
    }
    activeTaskId = null;
    activeListPath = null;
    activeLinkedList = null;
    linkedListEditing = false;
    linkedListSourceOrdinal = null;
    canvas.clearFrom(1);
    return true;
  }

  function handleActiveListChange(path: string | null) {
    activeListPath = path;
  }

  async function handleOpenList(path: string, title: string) {
    if (
      activeLinkedList?.path !== path &&
      linkedListEditing &&
      !(await linkedListSurface?.exit())
    ) {
      return;
    }
    activeTaskId = null;
    activeListPath = path;
    activeLinkedList = { path, title };
    linkedListEditing = false;
    linkedListSourceOrdinal = null;
    const pathKey = `list:${path}`;
    if (canvas.pathAt(1) === pathKey) {
      canvas.open("detail");
      return;
    }
    canvas.select(1, pathKey);
  }

  async function deleteLinkedList(path: string, parentPath: string) {
    if (!repository) return;
    if (activeLinkedList?.path === path && !(await closeDetailColumn())) return;
    await repository.deleteList(path, (now ?? clock()).toISOString(), {
      skipParentPaths: [parentPath],
    });
    if (activeListPath === path) activeListPath = null;
    await onRefreshWorkspace?.();
  }

  function handleOpenApplication(applicationId: string) {
    if (!showRelated) {
      onOpenApplication(applicationId);
      return;
    }
    const ownerId =
      activeTask?.applicationId === applicationId
        ? activeTask.id
        : (tasks.find((task) => task.applicationId === applicationId)?.id ??
          null);
    if (ownerId) handleActiveTaskChange(ownerId);
    if (canvas.pathAt(2) === applicationId) {
      canvas.open("related");
      return;
    }
    canvas.select(2, applicationId);
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

  function removeActiveTask(task: Task) {
    onDeleteTask(task);
    handleActiveTaskChange(null);
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
      return activeTaskId;
    },
    get activeListPath() {
      return activeListPath;
    },
    get pageTitle() {
      return activePlannerLabel;
    },
    hideMatchingDocumentTitle: true,
    onActiveTaskChange: handleActiveTaskChange,
    onActiveListChange: handleActiveListChange,
    onOpenList: handleOpenList,
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

  const linkedListSurfaceController: TasksMarkdownSurfaceController = {
    kind: "tasks-markdown",
    get tasks() {
      return tasks;
    },
    get activeTaskId() {
      return activeTaskId;
    },
    get activeListPath() {
      return activeListPath;
    },
    get pageTitle() {
      return activeLinkedList?.title ?? null;
    },
    hideMatchingDocumentTitle: true,
    onActiveTaskChange: handleActiveTaskChange,
    onActiveListChange: handleActiveListChange,
    onOpenList: handleOpenList,
    onSaveTask: (task) => onSaveTask(task),
    onDeleteTask: (task) => onDeleteTask(task),
    onDeleteList: deleteLinkedList,
    onRefresh: () => onRefreshWorkspace?.(),
    onOpenNote: (path) => onOpenNote?.(path),
    get sourceRunOrdinal() {
      return linkedListSourceOrdinal;
    },
    onRevealSource: (section) => {
      linkedListSourceOrdinal = section.ordinal;
      linkedListSurface?.enter();
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

  const taskDocumentSurfaceController: TasksMarkdownSurfaceController = {
    kind: "tasks-markdown",
    get tasks() {
      return tasks;
    },
    get activeTaskId() {
      return activeTaskId;
    },
    get activeListPath() {
      return activeListPath;
    },
    get pageTitle() {
      return activeTask?.title ?? null;
    },
    hideMatchingDocumentTitle: true,
    onActiveTaskChange: handleActiveTaskChange,
    onActiveListChange: handleActiveListChange,
    onOpenList: handleOpenList,
    onSaveTask: (task) => onSaveTask(task),
    onDeleteTask: (task) => onDeleteTask(task),
    onDeleteList: deleteLinkedList,
    onRefresh: () => onRefreshWorkspace?.(),
    onOpenNote: (path) => onOpenNote?.(path),
    get sourceRunOrdinal() {
      return taskDocumentSourceOrdinal;
    },
    onRevealSource: (run) => {
      taskDocumentSourceOrdinal = run.ordinal;
      taskDocumentSurface?.enter();
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

  function editTaskListDocument() {
    taskListSourceOrdinal = null;
    taskListSurface?.enter();
  }

  async function readTaskListDocument() {
    if (await taskListSurface?.exit()) taskListSourceOrdinal = null;
  }

  function editLinkedListDocument() {
    linkedListSourceOrdinal = null;
    linkedListSurface?.enter();
  }

  function editTaskDocument() {
    taskDocumentSourceOrdinal = null;
    taskDocumentSurface?.enter();
  }

  async function readTaskDocument() {
    if (await taskDocumentSurface?.exit()) taskDocumentSourceOrdinal = null;
  }

  async function readLinkedListDocument() {
    if (await linkedListSurface?.exit()) linkedListSourceOrdinal = null;
  }

  function bucketCount(bucket: TaskBucket) {
    if (bucket === "inbox") return snapshot.inbox.length;
    if (bucket === "today") {
      return snapshot.today.length + snapshot.thisEvening.length;
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
            <ColumnCanvas.Title>{activePlannerLabel}</ColumnCanvas.Title>
          </div>
          <ColumnCanvas.HeaderActions>
            <ColumnCanvas.Toggle />
            {#if showTodayShortcut || (taskArea && selectedListNode && app && repository)}
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
            {/if}
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
            bind:selectedDate
            {applications}
            view={taskView}
            area={taskArea}
            {activeTaskId}
            detailsPresentation="external"
            taskAreas={snapshot.areas}
            {applicationSummaries}
            onActiveTaskChange={handleActiveTaskChange}
            {onSaveTask}
            {onCreateTask}
            {onDeleteTask}
            {onLoadChecklist}
            {onToggleChecklistItem}
            {checklistRefreshVersion}
            {onSaveApplication}
            onOpenApplication={handleOpenApplication}
            onDragTargetChange={(targetId) => (activeDropTargetId = targetId)}
            />
          {/if}
        </div>
      </ColumnCanvas.Column>

      <ColumnCanvas.Column
        id="detail"
        class={activeLinkedList
          ? "task-column-canvas-story__linked-list-column"
          : undefined}
      >
        {#if activeLinkedList && app && repository}
          <ColumnCanvas.Header>
            <div
              data-ui-component="column-canvas"
              data-ui-part="column-header-main"
            >
              <ColumnCanvas.Title>{activeLinkedList.title}</ColumnCanvas.Title>
            </div>
            <ColumnCanvas.HeaderActions>
              <button
                type="button"
                class="task-column-canvas-story__markdown-mode"
                aria-label={linkedListEditing
                  ? `Read ${activeLinkedList.title}`
                  : `Edit ${activeLinkedList.title}`}
                title={linkedListEditing ? "Reading view" : "Edit"}
                onclick={() =>
                  linkedListEditing
                    ? void readLinkedListDocument()
                    : editLinkedListDocument()}
              >
                {#if linkedListEditing}
                  <BookOpenIcon aria-hidden="true" />
                {:else}
                  <PencilIcon aria-hidden="true" />
                {/if}
              </button>
              <ColumnCanvas.Close onclick={() => void closeDetailColumn()} />
            </ColumnCanvas.HeaderActions>
          </ColumnCanvas.Header>
          <div class="task-column-canvas-story__pane">
            <TaskMarkdownSurface
              bind:this={linkedListSurface}
              bind:editing={linkedListEditing}
              {app}
              {repository}
              path={activeLinkedList.path}
              controller={linkedListSurfaceController}
            />
          </div>
        {:else if activeTask}
          <ApplicationTaskSidebarDetail
            task={activeTask}
            application={activeTaskApplication}
            documentBodyEnabled={Boolean(
              app && repository && activeTask.sourcePath,
            )}
            onToggleDone={toggleActiveTaskDone}
            onUpdateTitle={updateActiveTaskTitle}
            onRemoveTask={removeActiveTask}
            onOpenApplication={handleOpenApplication}
          >
            {#snippet closeAction()}
              <ColumnCanvas.Close onclick={() => void closeDetailColumn()} />
            {/snippet}
            {#snippet documentModeAction()}
              {#if app && repository && activeTask.sourcePath}
                <button
                  type="button"
                  class="task-column-canvas-story__markdown-mode"
                  aria-label={taskDocumentEditing
                    ? `Read ${activeTask.title}`
                    : `Edit ${activeTask.title}`}
                  title={taskDocumentEditing ? "Reading view" : "Edit"}
                  onclick={() =>
                    taskDocumentEditing
                      ? void readTaskDocument()
                      : editTaskDocument()}
                >
                  {#if taskDocumentEditing}
                    <BookOpenIcon aria-hidden="true" />
                  {:else}
                    <PencilIcon aria-hidden="true" />
                  {/if}
                </button>
              {/if}
            {/snippet}
            {#snippet documentBody()}
              {#if app && repository && activeTask.sourcePath}
                <TaskMarkdownSurface
                  bind:this={taskDocumentSurface}
                  bind:editing={taskDocumentEditing}
                  {app}
                  {repository}
                  path={activeTask.sourcePath!}
                  controller={taskDocumentSurfaceController}
                />
              {/if}
            {/snippet}
          </ApplicationTaskSidebarDetail>
        {:else}
          <div class="task-column-canvas-story__related-empty">
            <ColumnCanvas.Close onclick={() => void closeDetailColumn()} />
            <p>Select a Task’s details control to open it here.</p>
          </div>
        {/if}
      </ColumnCanvas.Column>

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
