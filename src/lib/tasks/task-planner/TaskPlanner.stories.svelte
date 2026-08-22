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
  name="Constrained Today sidebar"
  tags={["test"]}
  parameters={{
    docs: {
      description: {
        story:
          "Today planner mounted at a sidebar width; its sticky calendar compresses without clipping and switches to single-letter weekdays.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "Wednesday", level: 1 }),
    ).toBeVisible();

    const planner = canvasElement.querySelector<HTMLElement>(".tasks-planner")!;
    const content = canvasElement.querySelector<HTMLElement>(
      ".tasks-planner__content",
    )!;
    const calendar = canvasElement.querySelector<HTMLElement>(
      ".tasks-planner__agenda-calendar",
    )!;
    const weekNavigation = canvasElement.querySelector<HTMLElement>(
      ".tasks-planner__week-navigation",
    )!;
    const shortWeekday = calendar.querySelector<HTMLElement>(
      ".tasks-planner__week-label--short",
    )!;
    const narrowWeekday = calendar.querySelector<HTMLElement>(
      ".tasks-planner__week-label--narrow",
    )!;

    const contentStyle = getComputedStyle(content);
    expect(Number.parseFloat(contentStyle.paddingLeft)).toBeLessThanOrEqual(9);
    expect(Number.parseFloat(contentStyle.paddingRight)).toBeLessThanOrEqual(9);
    expect(getComputedStyle(shortWeekday).display).toBe("none");
    expect(getComputedStyle(narrowWeekday).display).not.toBe("none");
    expect(narrowWeekday.textContent).toBe("M");

    const plannerBox = planner.getBoundingClientRect();
    const calendarBox = calendar.getBoundingClientRect();
    const weekNavigationBox = weekNavigation.getBoundingClientRect();
    expect(calendarBox.left).toBeCloseTo(plannerBox.left, 1);
    expect(calendarBox.right).toBeCloseTo(plannerBox.right, 1);
    expect(calendarBox.width).toBeLessThanOrEqual(plannerBox.width + 1);
    expect(weekNavigationBox.left).toBeGreaterThanOrEqual(calendarBox.left - 1);
    expect(weekNavigationBox.right).toBeLessThanOrEqual(calendarBox.right + 1);
    expect(
      Number.parseFloat(
        getComputedStyle(
          canvas.getByRole("heading", { name: "Wednesday", level: 1 }),
        ).fontSize,
      ),
    ).toBeLessThan(22);
  }}
>
  {#snippet template()}
    <div class="task-story-shell-stage task-story-shell-stage--constrained-sidebar">
      <div
        class="task-story-shell-stage__surface task-story-shell-stage__surface--constrained-sidebar"
      >
        <TaskPlanner
          tasks={[]}
          view="today"
          {applicationSummaries}
          selectedDate="2026-08-19"
          actualToday="2026-08-19"
        />
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
