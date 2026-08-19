<script lang="ts">
  import ArchiveIcon from "@lucide/svelte/icons/archive";
  import BoxesIcon from "@lucide/svelte/icons/boxes";
  import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import CircleEllipsisIcon from "@lucide/svelte/icons/circle-ellipsis";
  import FolderKanbanIcon from "@lucide/svelte/icons/folder-kanban";
  import ListTodoIcon from "@lucide/svelte/icons/list-todo";
  import NotebookTabsIcon from "@lucide/svelte/icons/notebook-tabs";
  import ServerIcon from "@lucide/svelte/icons/server";
  import { AppShell, AppShellController } from "@lapismd/design-core/shell";
  import {
    buildPlannerApplicationSummaries,
    buildTaskPlannerSnapshot,
    createTask,
    sampleApplicationBoard,
    type JobApplication,
    type Task,
    type TaskBucket,
    type TaskQuickCreateInput,
  } from "../../model";
  import { samplePlannerTasks } from "../story-fixture";
  import ApplicationTaskSidebarDetail from "../application-task-sidebar-detail/ApplicationTaskSidebarDetail.svelte";
  import ApplicationTaskPlannerMode from "./ApplicationTaskPlannerMode.svelte";
  import "./ApplicationTaskPlannerAppShellStory.css";

  const projects = [
    {
      id: "tasks-api",
      label: "Tasks API",
      detail: "Resource plugin",
      icon: ServerIcon,
    },
    {
      id: "lapis-notes",
      label: "Lapis Notes",
      detail: "Knowledge workspace",
      icon: NotebookTabsIcon,
    },
    {
      id: "ui-catalog",
      label: "UI Catalog",
      detail: "Shared components",
      icon: BoxesIcon,
    },
  ];

  const plannerBuckets = [
    { id: "today", label: "Today", icon: ListTodoIcon },
    { id: "upcoming", label: "Upcoming", icon: CalendarDaysIcon },
    { id: "anytime", label: "Anytime", icon: CircleEllipsisIcon },
    { id: "someday", label: "Someday", icon: CalendarClockIcon },
    { id: "logbook", label: "Logbook", icon: ArchiveIcon },
  ] satisfies Array<{
    id: TaskBucket;
    label: string;
    icon: typeof ListTodoIcon;
  }>;

  const shell = new AppShellController({
    leftWidth: 236,
    rightClosed: true,
    rightWidth: 340,
  });
  const projectSidebar = shell.createSidebar("projects", "left", {
    width: 220,
  });
  const plannerSidebar = shell.left;
  const detailSidebar = shell.right;
  const applicationSummaries =
    buildPlannerApplicationSummaries(sampleApplicationBoard);

  let tasks = $state(samplePlannerTasks());
  let applications = $state<JobApplication[]>(
    sampleApplicationBoard.applications.map((application) => ({
      ...application,
      tasks: application.tasks?.map((task) => ({ ...task })),
    })),
  );
  let selectedProject = $state("tasks-api");
  let taskView = $state<TaskBucket>("today");
  let taskArea = $state<string | null>(null);
  let activeDropTargetId = $state<string | null>(null);
  let activeTaskId = $state<string | null>(null);

  const snapshot = $derived(buildTaskPlannerSnapshot(tasks));
  const selectedProjectDetails = $derived(
    projects.find((project) => project.id === selectedProject) ?? projects[0],
  );
  const activePlannerLabel = $derived(
    taskArea
      ? (snapshot.areas.find((area) => area.id === taskArea)?.title ?? taskArea)
      : (plannerBuckets.find((bucket) => bucket.id === taskView)?.label ??
        "Today"),
  );
  const projectCompact = $derived(
    shell.mobile.resolvedMode === "desktop" &&
      projectSidebar.collapsed &&
      !projectSidebar.closed &&
      !projectSidebar.previewed,
  );
  const plannerCompact = $derived(
    shell.mobile.resolvedMode === "desktop" &&
      plannerSidebar.collapsed &&
      !plannerSidebar.closed &&
      !plannerSidebar.previewed,
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

  $effect(() => {
    if (detailSidebar.closed && activeTaskId !== null) {
      activeTaskId = null;
    }
  });

  function handleActiveTaskChange(taskId: string | null) {
    if (taskId) {
      // Open before assigning so the closed-sync effect cannot clear the selection.
      detailSidebar.open();
      activeTaskId = taskId;
      return;
    }
    activeTaskId = null;
    detailSidebar.close();
  }

  function updateActiveTaskTitle(task: Task, title: string) {
    saveTask({
      ...task,
      title,
      updatedAt: new Date().toISOString(),
    });
  }

  function toggleActiveTaskDone(task: Task) {
    const done = task.status !== "done";
    saveTask({
      ...task,
      status: done ? "done" : "todo",
      completedAt: done ? (task.completedAt ?? new Date().toISOString()) : undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  function removeActiveTask(task: Task) {
    deleteTask(task);
    handleActiveTaskChange(null);
  }

  function bucketCount(bucket: TaskBucket) {
    if (bucket === "today") {
      return snapshot.today.length + snapshot.thisEvening.length;
    }
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

  function showBucket(bucket: TaskBucket) {
    taskView = bucket;
    taskArea = null;
  }

  function showArea(areaId: string) {
    taskArea = areaId;
  }

  function saveTask(task: Task) {
    tasks = tasks.map((entry) => (entry.id === task.id ? task : entry));
  }

  function createPlannerTask(input: TaskQuickCreateInput) {
    const now = new Date().toISOString();
    const when =
      input.when ??
      (input.view === "today"
        ? "today"
        : input.view === "anytime"
          ? "anytime"
          : input.view === "someday"
            ? "someday"
            : undefined);
    tasks = [
      ...tasks,
      createTask({
        id: `story-shell-task-${tasks.length + 1}`,
        title: input.title,
        status: "todo",
        dueAt: input.dueAt,
        priority: input.priority,
        scheduledAt: input.scheduledAt,
        when,
        areas: input.area ? [input.area] : [],
        order: input.order,
        createdAt: now,
        updatedAt: now,
      }),
    ];
  }

  function deleteTask(task: Task) {
    tasks = tasks.filter((entry) => entry.id !== task.id);
  }

  function saveApplication(application: JobApplication) {
    applications = applications.map((entry) =>
      entry.id === application.id ? application : entry,
    );
  }
</script>

<div class="task-app-shell-story">
  <AppShell.Root
    controller={shell}
    displayMode="desktop"
    desktopMinMainWidth={0}
    class="task-app-shell-story__shell"
    data-task-planner-app-shell
  >
    <AppShell.Sidebar
      side="left"
      sidebarController={projectSidebar}
      label="Project selection"
      mobileLabel="Projects"
      resizeLabel="Resize project selection"
      variant="outer"
      closeable
      revealOnEdgeHover
      edgeRevealLabel="Preview projects sidebar"
    >
      <AppShell.Sidebar.Header class="task-app-shell-story__sidebar-header">
        {#if projectCompact}
          <AppShell.Sidebar.Close />
        {:else}
          <span class="task-app-shell-story__brand-mark" aria-hidden="true">
            <BoxesIcon />
          </span>
          <span class="task-app-shell-story__sidebar-title">
            <strong>Projects</strong>
            <small>Resource workspaces</small>
          </span>
          <AppShell.Sidebar.Close />
        {/if}
      </AppShell.Sidebar.Header>

      <AppShell.Sidebar.Body class="task-app-shell-story__project-body">
        <nav aria-label="Projects">
          {#each projects as project (project.id)}
            <button
              type="button"
              class="task-app-shell-story__project"
              class:task-app-shell-story__project--active={selectedProject ===
                project.id}
              aria-pressed={selectedProject === project.id}
              aria-label={project.label}
              title={project.label}
              onclick={() => (selectedProject = project.id)}
            >
              <span class="task-app-shell-story__project-icon">
                <project.icon aria-hidden="true" />
              </span>
              {#if !projectCompact}
                <span class="task-app-shell-story__project-copy">
                  <strong>{project.label}</strong>
                  <small>{project.detail}</small>
                </span>
              {/if}
            </button>
          {/each}
        </nav>
      </AppShell.Sidebar.Body>

      <AppShell.Sidebar.Footer class="task-app-shell-story__project-footer">
        {#if !projectCompact}
          <span
            class="task-app-shell-story__status-dot"
            aria-hidden="true"
          ></span>
          <span>Local workspace</span>
        {/if}
      </AppShell.Sidebar.Footer>
    </AppShell.Sidebar>

    <AppShell.Sidebar
      side="left"
      label="Planner navigation"
      mobileLabel="Planner"
      resizeLabel="Resize planner navigation"
    >
      <AppShell.Sidebar.Header class="task-app-shell-story__sidebar-header">
        <AppShell.Sidebar.Toggle
          side="left"
          sidebarController={projectSidebar}
          sidebarName="projects"
          previewOnHover
        />
        <span class="task-app-shell-story__planner-heading">
          <ListTodoIcon aria-hidden="true" />
          {#if !plannerCompact}
            <span>
              <strong>Tasks</strong>
              <small>{selectedProjectDetails?.label}</small>
            </span>
          {/if}
        </span>
      </AppShell.Sidebar.Header>

      <AppShell.Sidebar.Body class="task-app-shell-story__planner-body">
        <nav
          aria-label="Planner menu"
          data-planner-menu-dragging={activeDropTargetId !== null || undefined}
        >
          {#if !plannerCompact}
            <p class="task-app-shell-story__section-label">Planner</p>
          {/if}
          {#each plannerBuckets as bucket (bucket.id)}
            {@const dropId = `planner-sidebar:${bucket.id}`}
            <button
              type="button"
              class="task-app-shell-story__planner-item"
              class:task-app-shell-story__planner-item--active={!taskArea &&
                taskView === bucket.id}
              class:task-app-shell-story__planner-item--drop-active={activeDropTargetId ===
                dropId}
              aria-current={!taskArea && taskView === bucket.id
                ? "page"
                : undefined}
              data-planner-drop-active={activeDropTargetId === dropId ||
                undefined}
              data-planner-drop-data={JSON.stringify({
                type: "planner-sidebar-bucket",
                bucket: bucket.id,
              })}
              data-planner-drop-id={dropId}
              data-planner-drop-mode="valid"
              onclick={() => showBucket(bucket.id)}
            >
              <bucket.icon aria-hidden="true" />
              {#if !plannerCompact}
                <span>{bucket.label}</span>
                <small>{bucketCount(bucket.id)}</small>
              {/if}
            </button>
          {/each}

          {#if !plannerCompact}
            <p class="task-app-shell-story__section-label">Areas</p>
          {/if}
          {#each snapshot.areas as area (area.id)}
            <button
              type="button"
              class="task-app-shell-story__planner-item"
              class:task-app-shell-story__planner-item--active={taskArea ===
                area.id}
              aria-current={taskArea === area.id ? "page" : undefined}
              onclick={() => showArea(area.id)}
            >
              <FolderKanbanIcon aria-hidden="true" />
              {#if !plannerCompact}
                <span>{area.title}</span>
                <small>{area.count}</small>
              {/if}
            </button>
          {/each}
        </nav>
      </AppShell.Sidebar.Body>

      <AppShell.Sidebar.Footer class="task-app-shell-story__planner-footer">
        {#if !plannerCompact}
          <span>{tasks.length} Task resources</span>
        {/if}
      </AppShell.Sidebar.Footer>
    </AppShell.Sidebar>

    <AppShell.Main>
      <AppShell.Toolbar class="task-app-shell-story__toolbar">
        <div class="task-app-shell-story__toolbar-actions">
          <AppShell.Sidebar.Toggle side="left" sidebarName="planner" />
        </div>
        <div class="task-app-shell-story__breadcrumbs">
          <span>{selectedProjectDetails?.label}</span>
          <span aria-hidden="true">/</span>
          <strong>{activePlannerLabel}</strong>
        </div>
        <div class="task-app-shell-story__toolbar-trailing">
          <span class="task-app-shell-story__toolbar-status">
            <span aria-hidden="true"></span>
            Synced
          </span>
        </div>
      </AppShell.Toolbar>

      <AppShell.Body
        label="Task planner"
        class="task-app-shell-story__body"
      >
        <div class="task-app-shell-story__planner">
          <ApplicationTaskPlannerMode
            {tasks}
            {applications}
            view={taskView}
            area={taskArea}
            {activeTaskId}
            detailsPresentation="external"
            taskAreas={snapshot.areas}
            {applicationSummaries}
            onActiveTaskChange={handleActiveTaskChange}
            onSaveTask={saveTask}
            onCreateTask={createPlannerTask}
            onDeleteTask={deleteTask}
            onSaveApplication={saveApplication}
            onDragTargetChange={(targetId) =>
              (activeDropTargetId = targetId)}
          />
        </div>
      </AppShell.Body>
    </AppShell.Main>

    <AppShell.Sidebar
      side="right"
      label="Task details"
      mobileLabel="Details"
      resizeLabel="Resize task details"
      closeable
      class="task-app-shell-story__detail-sidebar"
    >
      <AppShell.Sidebar.Body class="task-app-shell-story__detail-body">
        {#if activeTask}
          <ApplicationTaskSidebarDetail
            task={activeTask}
            application={activeTaskApplication}
            onToggleDone={toggleActiveTaskDone}
            onUpdateTitle={updateActiveTaskTitle}
            onRemoveTask={removeActiveTask}
          >
            {#snippet closeAction()}
              <AppShell.Sidebar.Close />
            {/snippet}
          </ApplicationTaskSidebarDetail>
        {:else}
          <div class="task-app-shell-story__detail-empty">
            <div class="task-app-shell-story__detail-empty-top">
              <AppShell.Sidebar.Close />
            </div>
            <p>Select a Task’s details control to open it here.</p>
          </div>
        {/if}
      </AppShell.Sidebar.Body>
    </AppShell.Sidebar>
  </AppShell.Root>
</div>
