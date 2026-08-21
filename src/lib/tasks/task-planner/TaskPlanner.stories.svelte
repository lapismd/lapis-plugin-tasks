<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, within } from "storybook/test";
  import { TaskPlannerExample } from "../../catalog.example-sources";
  import {
    samplePlannerApplicationSummaries,
    samplePlannerTasks,
  } from "../story-fixture";
  import TaskPlanner from "./TaskPlanner.svelte";
  import { selectedDateHistoryStoryRows } from "../task-occurrence-history/history-story-fixtures";

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

<Story
  name="Historical selected date"
  tags={["visual-pending", "test"]}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("region", { name: "Task occurrence history" })).toBeVisible();
    await expect(canvas.getByText("3 pages")).toBeVisible();
    await expect(canvas.getByText("unrecorded")).toBeVisible();
  }}
>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div class="task-story-shell-stage__surface">
        <TaskPlanner
          tasks={[]}
          view="today"
          selectedDate="2026-08-20"
          actualToday="2026-08-21"
          historyRows={selectedDateHistoryStoryRows}
        />
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
