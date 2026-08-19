<script lang="ts">
  import ArchiveIcon from "@lucide/svelte/icons/archive";
  import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import CircleEllipsisIcon from "@lucide/svelte/icons/circle-ellipsis";
  import InboxIcon from "@lucide/svelte/icons/inbox";
  import ListTodoIcon from "@lucide/svelte/icons/list-todo";
  import * as ColumnCanvas from "@lapismd/design-core/shadcn/column-canvas";
  import {
    findListNavNode,
    listTreeFromAreas,
    type JobApplication,
    type ListTreeDropTarget,
    type Task,
    type TaskBucket,
    type TaskPlannerSnapshot,
    type TaskQuickCreateInput,
  } from "../../model";
  import ApplicationTaskSidebarDetail from "../application-task-sidebar-detail/ApplicationTaskSidebarDetail.svelte";
  import ApplicationTaskPlannerMode from "./ApplicationTaskPlannerMode.svelte";
  import TaskListNavTree from "./TaskListNavTree.svelte";
  import "./ApplicationTaskPlannerColumnCanvasStory.css";

  type ApplicationSummary = {
    title: string;
    subtitle?: string;
    color?: string;
  };

  let {
    tasks,
    now,
    snapshot,
    applications = [],
    applicationSummaries = {},
    showRelated = false,
    variant = "story",
    onSaveTask,
    onCreateTask,
    onDeleteTask,
    onSaveApplication = () => {},
    onOpenApplication = () => {},
    onExpandList,
    onDropList,
  }: {
    tasks: Task[];
    now?: Date;
    snapshot: TaskPlannerSnapshot;
    applications?: JobApplication[];
    applicationSummaries?: Record<string, ApplicationSummary>;
    showRelated?: boolean;
    variant?: "story" | "workspace";
    onSaveTask: (task: Task) => void;
    onCreateTask: (input: TaskQuickCreateInput) => void;
    onDeleteTask: (task: Task) => void;
    onSaveApplication?: (application: JobApplication) => void;
    onOpenApplication?: (applicationId: string) => void;
    onExpandList?: (id: string) => void;
    onDropList?: (sourcePath: string, target: ListTreeDropTarget) => void;
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
  let taskArea = $state<string | null>(null);
  let activeTaskId = $state<string | null>(null);

  const activePlannerLabel = $derived(
    taskArea
      ? (findListNavNode(listTree, taskArea)?.title ??
        snapshot.areas.find((area) => area.id === taskArea)?.title ??
        taskArea)
      : (plannerBuckets.find((bucket) => bucket.id === taskView)?.label ??
        "Today"),
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
    if (!canvas.isSelected(0, id)) {
      canvas.select(0, id);
      return;
    }
    canvas.clearFrom(1);
  }

  function handleActiveTaskChange(taskId: string | null) {
    if (taskId) {
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

  function closeDetailColumn() {
    activeTaskId = null;
    canvas.clearFrom(1);
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
      updatedAt: new Date().toISOString(),
    });
  }

  function toggleActiveTaskDone(task: Task) {
    const done = task.status !== "done";
    onSaveTask({
      ...task,
      status: done ? "done" : "todo",
      completedAt: done ? (task.completedAt ?? new Date().toISOString()) : undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  function removeActiveTask(task: Task) {
    onDeleteTask(task);
    handleActiveTaskChange(null);
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
          <p class="task-column-canvas-story__section-label">Planner</p>
          {#each plannerBuckets as bucket (bucket.id)}
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
          {/each}

          <TaskListNavTree
            tree={listTree}
            selectedId={taskArea}
            isSelected={(id) => canvas.isSelected(0, id)}
            onSelect={showNav}
            onExpand={onExpandList}
            onDrop={onDropList}
          />
        </ColumnCanvas.Body>
      </ColumnCanvas.Column>

      <ColumnCanvas.Column id="planner" title={activePlannerLabel}>
        <div class="task-column-canvas-story__pane">
          <ApplicationTaskPlannerMode
            {tasks}
            {now}
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
            {onSaveApplication}
            onOpenApplication={handleOpenApplication}
          />
        </div>
      </ColumnCanvas.Column>

      <ColumnCanvas.Column id="detail">
        {#if activeTask}
          <ApplicationTaskSidebarDetail
            task={activeTask}
            application={activeTaskApplication}
            onToggleDone={toggleActiveTaskDone}
            onUpdateTitle={updateActiveTaskTitle}
            onRemoveTask={removeActiveTask}
            onOpenApplication={handleOpenApplication}
          >
            {#snippet closeAction()}
              <ColumnCanvas.Close onclick={closeDetailColumn} />
            {/snippet}
          </ApplicationTaskSidebarDetail>
        {:else}
          <div class="task-column-canvas-story__related-empty">
            <ColumnCanvas.Close onclick={closeDetailColumn} />
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
