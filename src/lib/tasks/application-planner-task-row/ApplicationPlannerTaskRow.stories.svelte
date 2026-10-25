<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, waitFor, within } from "storybook/test";
  import { ApplicationPlannerTaskRowExample } from "../../catalog.example-sources";
  import { formatFullTaskDate } from "../../model";
  import ApplicationPlannerTaskRow from "./ApplicationPlannerTaskRow.svelte";
  import ApplicationPlannerTaskRowSampleStory from "./ApplicationPlannerTaskRowSampleStory.svelte";
  import { noop } from "../story-fixture";
  import { samplePlannerTasks } from "../story-fixture";
  import { playTitleClickStartsInlineEditOnRow } from "../title-inline-edit.story-play";

  const selectedTasks = samplePlannerTasks()
    .filter((entry) => entry.when === "today" && entry.status !== "done")
    .slice(0, 3);
  const rowStoryNow = new Date(2026, 7, 19, 9, 0, 0);
  const overdueScheduledTask = {
    ...(samplePlannerTasks().find(
      (entry) => entry.id === "story-task-daily-reflection",
    ) ?? samplePlannerTasks()[0]!),
    id: "story-task-overdue-schedule-chip",
    dueAt: undefined,
    deadline: undefined,
    scheduledAt: "2026-08-17",
    planDate: "2026-08-17",
    planAt: "morning",
    repeat: undefined,
    unparsedRepeat: undefined,
  };
  overdueScheduledTask.title = "Follow up on overdue planned work";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Rows/Planner Task Row",
    component: ApplicationPlannerTaskRow,
    parameters: {
      docs: {
        source: {
          code: ApplicationPlannerTaskRowExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component:
            "Planner task row with application summary and scheduling controls.",
        },
      },
    },
  });
</script>

<Story
  name="Sample row"
  tags={["test"]}
  parameters={{
    a11y: {
      // Row chrome is role=button with nested controls.
      test: "off",
    },
    docs: {
      description: {
        story:
          "Clicking the collapsed title replaces the button with a focused contenteditable textbox. Edit mode is owned by the row, not Planner Mode.",
      },
    },
  }}
  play={async (context) => {
    const canvas = within(context.canvasElement);
    const page = within(context.canvasElement.ownerDocument.body);
    const row = context.canvasElement.querySelector<HTMLElement>(
      ".application-planner-task-row",
    )!;
    const meta = row.querySelector<HTMLElement>(
      ".application-planner-task-row__meta",
    )!;
    const scheduleChip = within(meta).getByRole("button", {
      name: "Set planner schedule",
      exact: true,
    });
    const repeatChip = within(meta).getByRole("button", {
      name: "Set task recurrence",
      exact: true,
    });
    const listChip = within(meta).getByRole("button", {
      name: "Task list",
      exact: true,
    });
    const metadataButtons = Array.from(meta.querySelectorAll("button"));
    expect(metadataButtons.slice(0, 3)).toEqual([
      scheduleChip,
      repeatChip,
      listChip,
    ]);
    expect(scheduleChip).toHaveTextContent("Today");
    expect(scheduleChip).toHaveTextContent("Morning");
    expect(scheduleChip).not.toHaveClass("task-when-picker__trigger--overdue");
    expect(
      scheduleChip.querySelector(".task-when-picker__chip-time svg"),
    ).not.toBeNull();
    expect(repeatChip).toHaveTextContent("Daily");
    expect(listChip).toHaveTextContent("Applications");
    const dueIndicator = row.querySelector<HTMLElement>(".task-line__due");
    expect(dueIndicator).not.toBeNull();
    expect(dueIndicator).not.toHaveClass("task-line__due--overdue");
    expect(getComputedStyle(scheduleChip).borderRadius).not.toBe("0px");
    expect(getComputedStyle(scheduleChip).backgroundColor).not.toBe(
      "rgba(0, 0, 0, 0)",
    );
    expect(getComputedStyle(repeatChip).backgroundColor).not.toBe(
      "rgba(0, 0, 0, 0)",
    );

    await userEvent.click(scheduleChip);
    await waitFor(() =>
      expect(
        page.getByRole("dialog", {
          name: "Choose planner schedule",
          exact: true,
        }),
      ).toBeVisible(),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(scheduleChip).toHaveAttribute("aria-expanded", "false");
      expect(
        page.queryByRole("dialog", { name: "Choose planner schedule" }),
      ).not.toBeInTheDocument();
    });
    await userEvent.click(repeatChip);
    await waitFor(() =>
      expect(
        page.getByRole("dialog", {
          name: "Choose task recurrence",
          exact: true,
        }),
      ).toBeVisible(),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(repeatChip).toHaveAttribute("aria-expanded", "false");
      expect(
        page.queryByRole("dialog", { name: "Choose task recurrence" }),
      ).not.toBeInTheDocument();
      expect(
        getComputedStyle(context.canvasElement.ownerDocument.body).pointerEvents,
      ).not.toBe("none");
    });

    expect(canvas.getByRole("button", { name: "Daily stand-up reflection" }))
      .toBeVisible();
    await playTitleClickStartsInlineEditOnRow(context);
  }}
>
  {#snippet template()}
    <ApplicationPlannerTaskRowSampleStory />
  {/snippet}
</Story>

<Story
  name="Overdue schedule chip"
  tags={["test"]}
  parameters={{
    a11y: {
      // Row chrome is role=button with nested controls.
      test: "off",
    },
    docs: {
      description: {
        story:
          "Overdue planned dates render as relative distance chips with a full-date tooltip.",
      },
    },
  }}
  play={async (context) => {
    const canvas = within(context.canvasElement);
    const page = within(context.canvasElement.ownerDocument.body);
    const scheduleChip = canvas.getByRole("button", {
      name: "Set planner schedule",
      exact: true,
    });
    expect(scheduleChip).toHaveTextContent("2 days ago");
    expect(scheduleChip).toHaveTextContent("Morning");
    expect(scheduleChip).toHaveClass("task-when-picker__trigger--overdue");
    expect(
      scheduleChip.querySelector(".task-when-picker__chip-time svg"),
    ).not.toBeNull();

    await userEvent.hover(scheduleChip);
    await waitFor(() =>
      expect(
        page.getByText(`Scheduled ${formatFullTaskDate("2026-08-17")}`),
      ).toBeVisible(),
    );
    await userEvent.unhover(scheduleChip);
  }}
>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--xl">
      <ApplicationPlannerTaskRow
        task={overdueScheduledTask}
        now={rowStoryNow}
        taskIndex={0}
        taskTotal={1}
        onOpenApplication={noop}
      />
    </div>
  {/snippet}
</Story>

<Story
  name="Consecutive selection with deadlines"
  tags={["visual-pending", "skip-test", "!test"]}
  parameters={{
    docs: {
      description: {
        story: "Selected planner rows with consecutive selection chrome and deadlines.",
      },
    },
  }}
>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--xl task-story-frame--selection">
      {#each selectedTasks as selectedTask, index (selectedTask.id)}
        <ApplicationPlannerTaskRow
          task={selectedTask}
          application={{
            title: "Applications",
            subtitle: "Selected task",
            color: "#5b8def",
          }}
          taskIndex={index}
          taskTotal={selectedTasks.length}
          selected
          selectionPosition={index === 0
            ? "first"
            : index === selectedTasks.length - 1
              ? "last"
              : "middle"}
          onOpenApplication={noop}
        />
      {/each}
    </div>
  {/snippet}
</Story>
