<script lang="ts">
  import {
    buildPlannerApplicationSummaries,
    createTask,
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
        id: `story-task-created-${tasks.length + 1}`,
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

<ApplicationTaskPlannerMode
  {tasks}
  {applications}
  view="today"
  applicationSummaries={summaries}
  onSaveTask={saveTask}
  onCreateTask={createPlannerTask}
  onDeleteTask={deleteTask}
  onSaveApplication={saveApplication}
/>
