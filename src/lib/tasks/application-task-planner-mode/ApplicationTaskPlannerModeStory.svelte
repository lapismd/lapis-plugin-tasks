<script lang="ts">
  import {
    buildPlannerApplicationSummaries,
    createTask,
    PLANNER_FIXTURE_TODAY,
    sampleApplicationBoard,
    type JobApplication,
    type Task,
    type TaskQuickCreateInput,
  } from "../../model";
  import { samplePlannerTasks } from "../story-fixture";
  import ApplicationTaskPlannerMode from "./ApplicationTaskPlannerMode.svelte";

  let tasks = $state(samplePlannerTasks());
  let applications = $state<JobApplication[]>(
    sampleApplicationBoard.applications.map((application) => ({
      ...application,
      tasks: application.tasks?.map((task) => ({ ...task })),
    })),
  );

  const summaries = buildPlannerApplicationSummaries(sampleApplicationBoard);
  const storyNow = new Date(`${PLANNER_FIXTURE_TODAY}T12:00:00`);

  function saveTask(task: Task) {
    tasks = tasks.map((entry) => (entry.id === task.id ? task : entry));
  }

  function createPlannerTask(input: TaskQuickCreateInput) {
    const createdAt = storyNow.toISOString();
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
        id: `story-task-created-${tasks.length + 1}`,
        title: input.title,
        status: "open",
        dueAt: input.dueAt,
        priority: input.priority,
        scheduledAt: input.scheduledAt,
        when,
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
        listId: input.area ?? undefined,
        areas: input.area ? [input.area] : [],
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

<ApplicationTaskPlannerMode
  {tasks}
  now={storyNow}
  {applications}
  view="today"
  applicationSummaries={summaries}
  onSaveTask={saveTask}
  onCreateTask={createPlannerTask}
  onDeleteTask={deleteTask}
  onSaveApplication={saveApplication}
/>
