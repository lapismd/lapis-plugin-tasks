<script lang="ts">
  import {
    buildPlannerApplicationSummaries,
    buildTaskPlannerSnapshot,
    createTask,
    parsePlannerFixtures,
    PLANNER_FIXTURE_TODAY,
    sampleApplicationBoard,
    type ChecklistItem,
    type JobApplication,
    type Task,
    type TaskQuickCreateInput,
  } from "../../model";
  import { samplePlannerTasks } from "../story-fixture";
  import {
    cloneTasksPluginSettings,
    DEFAULT_TASKS_PLUGIN_SETTINGS,
    patchTasksPluginSettings,
    type TasksNavigationColumnState,
    type TasksPluginSettingsPatch,
  } from "../../tasks-settings";
  import { untrack } from "svelte";
  import TasksPlannerCanvas from "./TasksPlannerCanvas.svelte";

  let {
    initialNavigationColumnState = "expanded",
  }: {
    initialNavigationColumnState?: TasksNavigationColumnState;
  } = $props();

  const applicationSummaries = buildPlannerApplicationSummaries(
    sampleApplicationBoard,
  );

  let tasks = $state(samplePlannerTasks());
  let checklists = $state<Record<string, ChecklistItem[]>>(
    Object.fromEntries(
      parsePlannerFixtures()
        .filter((document) => document.kind === "task")
        .map((document) => [
          document.id,
          document.checklist.map((item) => ({ ...item })),
        ]),
    ),
  );
  let applications = $state<JobApplication[]>(
    sampleApplicationBoard.applications.map((application) => ({
      ...application,
      tasks: application.tasks?.map((task) => ({ ...task })),
    })),
  );
  let settings = $state(
    untrack(() =>
      patchTasksPluginSettings(
        cloneTasksPluginSettings(DEFAULT_TASKS_PLUGIN_SETTINGS),
        { planner: { navigationColumnState: initialNavigationColumnState } },
      ),
    ),
  );

  const now = new Date(`${PLANNER_FIXTURE_TODAY}T12:00:00`);
  const snapshot = $derived(buildTaskPlannerSnapshot(tasks, now));

  function saveTask(task: Task) {
    tasks = tasks.map((entry) => (entry.id === task.id ? task : entry));
  }

  async function loadChecklist(task: Task): Promise<ChecklistItem[]> {
    return (checklists[task.id] ?? []).map((item) => ({ ...item }));
  }

  async function toggleChecklistItem(
    task: Task,
    item: ChecklistItem,
    checked: boolean,
  ): Promise<ChecklistItem[]> {
    const next = (checklists[task.id] ?? []).map((entry) =>
      entry.position === item.position ? { ...entry, checked } : entry,
    );
    checklists = { ...checklists, [task.id]: next };
    saveTask({
      ...task,
      checklistTotal: next.length,
      checklistCompleted: next.filter((entry) => entry.checked).length,
    });
    return next.map((entry) => ({ ...entry }));
  }

  function createPlannerTask(input: TaskQuickCreateInput) {
    const createdAt = now.toISOString();
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
        id: `story-canvas-task-${tasks.length + 1}`,
        title: input.title,
        status: "open",
        dueAt: input.dueAt,
        priority: input.priority,
        scheduledAt: input.scheduledAt,
        when,
        listId: input.area ?? undefined,
        areas: input.area ? [input.area] : [],
        start: when === "someday" ? "someday" : "anytime",
        planDate:
          input.scheduledAt ??
          (when === "today" || when === "this-evening"
            ? PLANNER_FIXTURE_TODAY
            : undefined),
        planAt:
          input.planAt ??
          (when === "this-evening"
            ? "evening"
            : when === "today"
              ? "anytime"
              : undefined),
        order: input.order,
        createdAt,
        updatedAt: createdAt,
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

  function updateSettings(patch: TasksPluginSettingsPatch) {
    settings = patchTasksPluginSettings(settings, patch);
  }
</script>

<TasksPlannerCanvas
  {tasks}
  {now}
  {settings}
  {snapshot}
  {applications}
  {applicationSummaries}
  showRelated={true}
  onSaveTask={saveTask}
  onLoadChecklist={loadChecklist}
  onToggleChecklistItem={toggleChecklistItem}
  onCreateTask={createPlannerTask}
  onDeleteTask={deleteTask}
  onSaveApplication={saveApplication}
  onUpdateSettings={updateSettings}
/>
