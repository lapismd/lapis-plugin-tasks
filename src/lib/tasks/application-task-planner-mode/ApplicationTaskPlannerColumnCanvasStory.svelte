<script lang="ts">
  import {
    buildPlannerApplicationSummaries,
    buildTaskPlannerSnapshot,
    createTask,
    PLANNER_FIXTURE_TODAY,
    sampleApplicationBoard,
    type JobApplication,
    type Task,
    type TaskQuickCreateInput,
  } from "../../model";
  import { samplePlannerTasks } from "../story-fixture";
  import TasksPlannerCanvas from "./TasksPlannerCanvas.svelte";

  const applicationSummaries =
    buildPlannerApplicationSummaries(sampleApplicationBoard);

  let tasks = $state(samplePlannerTasks());
  let applications = $state<JobApplication[]>(
    sampleApplicationBoard.applications.map((application) => ({
      ...application,
      tasks: application.tasks?.map((task) => ({ ...task })),
    })),
  );

  const snapshot = $derived(
    buildTaskPlannerSnapshot(tasks, new Date(`${PLANNER_FIXTURE_TODAY}T12:00:00`)),
  );

  function saveTask(task: Task) {
    tasks = tasks.map((entry) => (entry.id === task.id ? task : entry));
  }

  function createPlannerTask(input: TaskQuickCreateInput) {
    const createdAt = new Date().toISOString();
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
        status: "todo",
        dueAt: input.dueAt,
        priority: input.priority,
        scheduledAt: input.scheduledAt,
        when,
        listId: input.area ?? undefined,
        areas: input.area ? [input.area] : [],
        start: when === "someday" ? "someday" : "anytime",
        planDate:
          when === "today" || when === "this-evening"
            ? PLANNER_FIXTURE_TODAY
            : undefined,
        planAt:
          when === "this-evening"
            ? "evening"
            : when === "today"
              ? "anytime"
              : undefined,
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
</script>

<TasksPlannerCanvas
  {tasks}
  {snapshot}
  {applications}
  {applicationSummaries}
  showRelated={true}
  onSaveTask={saveTask}
  onCreateTask={createPlannerTask}
  onDeleteTask={deleteTask}
  onSaveApplication={saveApplication}
/>
