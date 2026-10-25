<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, waitFor, within } from "storybook/test";
  import { ApplicationTaskPlannerModeExample } from "../../catalog.example-sources";
  import ApplicationTaskPlannerMode from "./ApplicationTaskPlannerMode.svelte";
  import ApplicationTaskPlannerModeStory from "./ApplicationTaskPlannerModeStory.svelte";
  import ApplicationTaskPlannerSortableStory from "./ApplicationTaskPlannerSortableStory.svelte";
  import { catalogTasksFromPlannerFixtures } from "../../model/planner-fixtures";
  import { playTitleClickStartsInlineEdit } from "../planner-title-edit-selection.story-play";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Planners/Planner Mode",
    component: ApplicationTaskPlannerMode,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskPlannerModeExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Task planner mode content for application kanban board.",
        },
      },
    },
  });
</script>

<Story
  name="Logbook header actions"
  tags={["visual-pending", "test"]}
  parameters={{
    a11y: {
      test: "error",
      config: { rules: [{ id: "nested-interactive", enabled: false }] },
    },
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const actions = canvas.getByRole("button", { name: "Logbook actions" });
    expect(actions.closest(".tasks-planner__header")).not.toBeNull();
    expect(
      canvasElement.querySelectorAll("[data-planner-sortable-row]"),
    ).toHaveLength(3);
    await userEvent.click(actions);
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await screen.findByRole("menuitemradio", {
        name: "Canceled",
        exact: true,
      }),
    );
    await waitFor(() =>
      expect(
        canvasElement.querySelectorAll("[data-planner-sortable-row]"),
      ).toHaveLength(1),
    );
    expect(
      canvas.getByRole("button", {
        name: "Cancel the duplicate reminder",
        exact: true,
      }),
    ).toBeVisible();
    await waitFor(() => {
      expect(actions).toHaveAttribute("aria-expanded", "false");
      expect(
        screen.queryByRole("menu", { name: "Logbook actions" }),
      ).not.toBeInTheDocument();
      expect(
        getComputedStyle(canvasElement.ownerDocument.body).pointerEvents,
      ).not.toBe("none");
    });
  }}
>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div class="task-story-shell-stage__surface">
        <ApplicationTaskPlannerMode
          tasks={catalogTasksFromPlannerFixtures()}
          now={new Date("2026-08-19T12:00:00")}
          view="logbook"
        />
      </div>
    </div>
  {/snippet}
</Story>

<Story name="Today view" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Planner mode showing the today board." } } }}>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div class="task-story-shell-stage__surface">
        <ApplicationTaskPlannerModeStory />
      </div>
    </div>
  {/snippet}
</Story>

<Story
  name="Constrained Today row spacing"
  tags={["test"]}
  parameters={{
    a11y: {
      // Row chrome is role=button with nested controls; this story guards constrained row geometry.
      test: "off",
    },
    docs: {
      description: {
        story:
          "Planner Mode mounted at a sidebar width keeps task row hover and selection surfaces inset from the panel and scrollbar edges.",
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
    const row = await waitFor(() => {
      const candidate = canvasElement.querySelector<HTMLElement>(
        ".application-planner-task-row",
      );
      expect(candidate).not.toBeNull();
      return candidate!;
    });
    const columns = row.querySelector<HTMLElement>(
      ".application-planner-task-row__columns",
    )!;

    await userEvent.hover(columns);

    const plannerBox = planner.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    const contentStyle = getComputedStyle(content);
    const contentStart = Number.parseFloat(contentStyle.paddingLeft);
    const contentEnd = Number.parseFloat(contentStyle.paddingRight);

    expect(rowBox.left - plannerBox.left).toBeGreaterThanOrEqual(
      contentStart - 1,
    );
    expect(plannerBox.right - rowBox.right).toBeGreaterThanOrEqual(
      contentEnd - 1,
    );
    expect(getComputedStyle(row).backgroundColor).not.toBe(
      "rgba(0, 0, 0, 0)",
    );
  }}
>
  {#snippet template()}
    <div class="task-story-shell-stage task-story-shell-stage--constrained-sidebar">
      <div
        class="task-story-shell-stage__surface task-story-shell-stage__surface--constrained-sidebar"
      >
        <ApplicationTaskPlannerModeStory />
      </div>
    </div>
  {/snippet}
</Story>

<Story
  name="Title click starts inline edit"
  tags={["test"]}
  parameters={{
    a11y: {
      // Row chrome is role=button with nested controls; covered by catalog smoke.
      test: "off",
    },
    docs: {
      description: {
        story:
          "Clicking a collapsed Task title replaces the title button with a focused contenteditable textbox (not a full-row select).",
      },
    },
  }}
  play={playTitleClickStartsInlineEdit}
>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div class="task-story-shell-stage__surface">
        <ApplicationTaskPlannerModeStory />
      </div>
    </div>
  {/snippet}
</Story>

<Story name="Sortable stress" tags={["visual-pending", "skip-test", "!test"]} parameters={{ docs: { description: { story: "Planner mode with many sortable rows." } } }}>
  {#snippet template()}
    <div class="task-story-shell-stage">
      <div
        class="task-story-shell-stage__surface task-story-shell-stage__surface--sortable"
      >
        <ApplicationTaskPlannerSortableStory />
      </div>
    </div>
  {/snippet}
</Story>
