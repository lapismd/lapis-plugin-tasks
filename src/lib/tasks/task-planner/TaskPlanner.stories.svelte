<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { TaskPlannerExample } from "../../catalog.example-sources";
  import {
    samplePlannerApplicationSummaries,
    samplePlannerTasks,
  } from "../story-fixture";
  import TaskPlanner from "./TaskPlanner.svelte";

  const tasks = samplePlannerTasks();
  const applicationSummaries = { ...samplePlannerApplicationSummaries };

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Planners/Planner",
    component: TaskPlanner,
    parameters: {
      docs: {
        source: {
          code: TaskPlannerExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component:
            "Task planner surface grouping tasks by today, upcoming, anytime, and area views.",
        },
      },
    },
  });
</script>

<Story name="Today" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Planner grouped to the today bucket." } } }}>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div class="task-story-shell-stage__surface">
        <TaskPlanner {tasks} view="today" {applicationSummaries} />
      </div>
    </div>
  {/snippet}
</Story>

<Story name="Upcoming" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Planner grouped to the upcoming bucket." } } }}>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div class="task-story-shell-stage__surface">
        <TaskPlanner {tasks} view="upcoming" {applicationSummaries} />
      </div>
    </div>
  {/snippet}
</Story>

<Story name="Anytime" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Planner grouped to the anytime bucket." } } }}>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div class="task-story-shell-stage__surface">
        <TaskPlanner {tasks} view="anytime" {applicationSummaries} />
      </div>
    </div>
  {/snippet}
</Story>

<Story name="By Area" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Planner filtered to one area." } } }}>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div class="task-story-shell-stage__surface">
        <TaskPlanner
          {tasks}
          view="anytime"
          area="Applications"
          {applicationSummaries}
        />
      </div>
    </div>
  {/snippet}
</Story>
