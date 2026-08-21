<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, waitFor, within } from "storybook/test";
  import { ApplicationTaskPreviewRowExample } from "../../catalog.example-sources";
  import ApplicationTaskPreviewRow from "./ApplicationTaskPreviewRow.svelte";
  import ApplicationTaskPreviewRowChecklistStory from "./ApplicationTaskPreviewRowChecklistStory.svelte";
  import ApplicationTaskPreviewRowSampleStory from "./ApplicationTaskPreviewRowSampleStory.svelte";
  import { playTitleClickStartsInlineEditOnRow } from "../title-inline-edit.story-play";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Rows/Task Preview Row",
    component: ApplicationTaskPreviewRow,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskPreviewRowExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Sortable task preview row for application prep editing.",
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
      test: "off",
    },
    docs: {
      description: {
        story:
          "Clicking the collapsed title replaces the button with a focused contenteditable textbox.",
      },
    },
  }}
  play={playTitleClickStartsInlineEditOnRow}
>
  {#snippet template()}
    <ApplicationTaskPreviewRowSampleStory />
  {/snippet}
</Story>

<Story
  name="Expanded metadata actions"
  tags={["test", "visual-pending"]}
  parameters={{
    a11y: { test: "off" },
    docs: {
      description: {
        story:
          "The double-click editor persists status, priority, schedule, exact time, List, and rolling recurrence changes through the shared row callback.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const state = () =>
      JSON.parse(canvas.getByTestId("task-preview-state").textContent ?? "{}") as Record<string, unknown>;

    await userEvent.click(canvas.getByRole("button", { name: "Task priority" }));
    await userEvent.click(page.getByRole("option", { name: "High" }));
    await waitFor(() => expect(state().priority).toBe("high"));

    await userEvent.click(canvas.getByRole("button", { name: "Set due date" }));
    await userEvent.click(
      within(page.getByRole("dialog", { name: "Choose due date" }))
        .getByRole("button", { name: "Today" }),
    );
    await waitFor(() => expect(state().dueAt).toBeTruthy());

    await userEvent.click(canvas.getByRole("button", { name: "Set planner schedule" }));
    await userEvent.click(
      within(page.getByRole("dialog", { name: "Choose planner schedule" }))
        .getByRole("button", { name: "Tomorrow" }),
    );
    await waitFor(() => expect(state().planDate).toBeTruthy());

    await userEvent.click(canvas.getByRole("button", { name: "Set planner day part" }));
    await userEvent.click(page.getByRole("option", { name: "12:00" }));
    await waitFor(() => expect(state().planAt).toBe("12:00"));

    await userEvent.click(canvas.getByRole("button", { name: "Set planner day part" }));
    const timeDialog = page.getByRole("dialog", {
      name: "Choose planner day part",
    });
    const customTime = within(timeDialog).getByLabelText("Custom planner time");
    await userEvent.clear(customTime);
    await userEvent.type(customTime, "14:45");
    await userEvent.click(
      within(timeDialog).getByRole("button", { name: "Apply" }),
    );
    await waitFor(() => expect(state().planAt).toBe("14:45"));

    await userEvent.click(canvas.getByRole("button", { name: "Task area" }));
    await userEvent.click(page.getByRole("option", { name: "Applications" }));
    await waitFor(() => {
      expect(state().areas).toEqual(["Applications"]);
      expect(state().listId).toBe("Applications");
    });

    await userEvent.click(canvas.getByRole("button", { name: "Set task recurrence" }));
    await userEvent.click(page.getByRole("option", { name: /^Weekly\b/ }));
    await waitFor(() =>
      expect(state().repeat).toMatchObject({
        frequency: "weekly",
        interval: 1,
        anchor: "schedule",
        lastCompletedAt: "2026-08-18T09:15:00.000Z",
        completionCount: 4,
      }),
    );

    await userEvent.click(canvas.getByRole("button", { name: "Set task recurrence" }));
    await userEvent.click(page.getByRole("option", { name: "Repeat every…" }));
    const recurrenceDialog = page.getByRole("dialog", {
      name: "Choose task recurrence",
    });
    const interval = within(recurrenceDialog).getByRole("spinbutton", {
      name: "Recurrence interval",
    });
    await userEvent.clear(interval);
    await userEvent.type(interval, "2");
    await userEvent.selectOptions(
      within(recurrenceDialog).getByLabelText("Recurrence frequency"),
      "monthly",
    );
    await userEvent.selectOptions(
      within(recurrenceDialog).getByLabelText("Recurrence anchor"),
      "completion",
    );
    await userEvent.click(
      within(recurrenceDialog).getByRole("checkbox", {
        name: "Reset checklist on completion",
      }),
    );
    await userEvent.click(
      within(recurrenceDialog).getByRole("button", {
        name: "Apply recurrence",
      }),
    );
    await waitFor(() =>
      expect(state().repeat).toMatchObject({
        frequency: "monthly",
        interval: 2,
        anchor: "completion",
        resetChecklist: true,
        lastCompletedAt: "2026-08-18T09:15:00.000Z",
        completionCount: 4,
      }),
    );

    await userEvent.click(canvas.getByRole("button", { name: "Task status" }));
    await userEvent.click(page.getByRole("option", { name: "Completed" }));
    await waitFor(() => {
      expect(state().status).toBe("completed");
      expect(state().done).toBe(true);
      expect(state().completedAt).toBeTruthy();
    });
  }}
>
  {#snippet template()}
    <ApplicationTaskPreviewRowSampleStory expandedByDefault recurringByDefault />
  {/snippet}
</Story>

<Story
  name="Recurrence date fallback"
  tags={["test", "visual-pending"]}
  parameters={{
    a11y: { test: "off" },
    docs: {
      description: {
        story:
          "The recurrence menu dismisses outside, derives presets from the effective plan date, restores the selected preset, and plans an undated Task for injected local today.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const state = () =>
      JSON.parse(canvas.getByTestId("task-preview-state").textContent ?? "{}") as Record<string, unknown>;

    await userEvent.click(canvas.getByRole("button", { name: "Set task recurrence" }));
    let recurrenceDialog = page.getByRole("dialog", {
      name: "Choose task recurrence",
    });
    expect(within(recurrenceDialog).getByText("No planned date")).toBeVisible();
    expect(
      within(recurrenceDialog).getByRole("option", {
        name: "Does not repeat",
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      within(recurrenceDialog).getByRole("option", {
        name: "Weekly on Friday",
      }),
    ).toBeVisible();
    expect(
      within(recurrenceDialog).getByRole("option", {
        name: "Every 2 weeks on Friday",
      }),
    ).toBeVisible();
    expect(
      within(recurrenceDialog).getByRole("option", {
        name: "Monthly on the 21st",
      }),
    ).toBeVisible();
    expect(
      within(recurrenceDialog).getByRole("option", {
        name: "Yearly on Aug 21",
      }),
    ).toBeVisible();

    await userEvent.click(canvas.getByRole("textbox", { name: "Task title" }));
    await waitFor(() =>
      expect(
        page.queryByRole("dialog", { name: "Choose task recurrence" }),
      ).not.toBeInTheDocument(),
    );

    await userEvent.click(canvas.getByRole("button", { name: "Set task recurrence" }));
    recurrenceDialog = page.getByRole("dialog", {
      name: "Choose task recurrence",
    });
    await userEvent.click(
      within(recurrenceDialog).getByRole("option", {
        name: "Weekly on Friday",
      }),
    );
    await waitFor(() => {
      expect(state().planDate).toBe("2026-08-21");
      expect(state().scheduledAt).toBe("2026-08-21");
      expect(state().planAt).toBe("anytime");
      expect(state().repeat).toMatchObject({
        frequency: "weekly",
        interval: 1,
        anchor: "schedule",
      });
    });

    await userEvent.click(canvas.getByRole("button", { name: "Set task recurrence" }));
    recurrenceDialog = page.getByRole("dialog", {
      name: "Choose task recurrence",
    });
    expect(within(recurrenceDialog).getByText("Today")).toBeVisible();
    expect(
      within(recurrenceDialog).getByRole("option", {
        name: "Weekly on Friday",
      }),
    ).toHaveAttribute("aria-current", "true");
  }}
>
  {#snippet template()}
    <ApplicationTaskPreviewRowSampleStory expandedByDefault />
  {/snippet}
</Story>

<Story
  name="Open checklist refreshes after an external edit"
  tags={["test"]}
  parameters={{
    a11y: {
      // Row chrome is role=button with nested controls; covered by catalog smoke.
      test: "off",
    },
    docs: {
      description: {
        story:
          "An external metadata revision refreshes an already-open checklist even when its aggregate counts do not change.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Show checklist for Review interview notes",
      }),
    );
    expect(
      await canvas.findByRole("checkbox", {
        name: "Prepare a mentoring example",
      }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Simulate external checklist edit" }),
    );
    expect(
      await canvas.findByRole("checkbox", {
        name: "Confirm the updated upgrade cadence",
      }),
    ).toBeVisible();
  }}
>
  {#snippet template()}
    <ApplicationTaskPreviewRowChecklistStory showExternalRefresh />
  {/snippet}
</Story>

<Story
  name="Checklist update rollback"
  tags={["test"]}
  parameters={{
    a11y: {
      // Row chrome is role=button with nested controls; covered by catalog smoke.
      test: "off",
    },
    docs: {
      description: {
        story:
          "A failed guarded write rolls the optimistic checkbox state back, refreshes checklist contents, and reports an inline error.",
      },
    },
  }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Show checklist for Review interview notes",
      }),
    );
    const checkbox = await canvas.findByRole("checkbox", {
      name: "Note the Kubernetes upgrade cadence",
    });
    await userEvent.click(checkbox);
    await waitFor(() => expect(checkbox).not.toBeChecked());
    expect(
      await canvas.findByRole("alert"),
    ).toHaveTextContent("Checklist changed; reload and try again.");
    expect(
      canvas.getByRole("progressbar", { name: "Checklist progress: 1 of 3" }),
    ).toBeVisible();
  }}
>
  {#snippet template()}
    <ApplicationTaskPreviewRowChecklistStory failUpdates />
  {/snippet}
</Story>
