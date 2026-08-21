<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
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

  async function waitForPointerInteraction(element: HTMLElement): Promise<void> {
    await waitFor(() => {
      let current: HTMLElement | null = element;
      while (current) {
        expect(getComputedStyle(current).pointerEvents).not.toBe("none");
        current = current.parentElement;
      }
    });
  }
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
        rrule: "FREQ=WEEKLY",
        anchor: "schedule",
        missed: "carry",
        lastCompletedAt: "2026-08-18T09:15:00.000Z",
        completionCount: 4,
      }),
    );

    await userEvent.click(canvas.getByRole("button", { name: "Set task recurrence" }));
    let recurrenceMenu = page.getByRole("dialog", {
      name: "Choose task recurrence",
    });
    expect(within(recurrenceMenu).queryByText("Presets")).not.toBeInTheDocument();
    await userEvent.click(
      within(recurrenceMenu).getByRole("button", { name: "Repeat every" }),
    );
    const repeatEveryInterval = within(recurrenceMenu).getByRole("spinbutton", {
      name: "Repeat every interval",
    });
    const repeatEveryFrequency = within(recurrenceMenu).getByRole("combobox", {
      name: "Repeat every frequency",
    });
    expect(repeatEveryInterval.tagName).toBe("INPUT");
    expect(repeatEveryFrequency.tagName).toBe("BUTTON");
    expect(
      Math.abs(
        repeatEveryInterval.getBoundingClientRect().top -
          repeatEveryFrequency.getBoundingClientRect().top,
      ),
    ).toBeLessThan(2);
    await userEvent.clear(repeatEveryInterval);
    await userEvent.type(repeatEveryInterval, "2");
    await userEvent.click(repeatEveryFrequency);
    await userEvent.click(
      within(
        page.getByRole("listbox", {
          name: "Repeat every frequency options",
        }),
      ).getByRole("option", { name: "Months" }),
    );
    await waitFor(() =>
      expect(state().repeat).toMatchObject({
        rrule: "FREQ=MONTHLY;INTERVAL=2",
        anchor: "schedule",
        missed: "carry",
      }),
    );
    const taskTitle = canvas.getByRole("textbox", { name: "Task title" });
    await waitForPointerInteraction(taskTitle);
    await userEvent.click(taskTitle);
    await waitFor(() =>
      expect(
        page.queryByRole("dialog", { name: "Choose task recurrence" }),
      ).not.toBeInTheDocument(),
    );
    const recurrenceTrigger = canvas.getByRole("button", {
      name: "Set task recurrence",
    });
    await waitForPointerInteraction(recurrenceTrigger);
    await userEvent.click(recurrenceTrigger);
    recurrenceMenu = page.getByRole("dialog", {
      name: "Choose task recurrence",
    });
    expect(
      within(recurrenceMenu).getByRole("button", { name: "Repeat every" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      within(recurrenceMenu).getByRole("spinbutton", {
        name: "Repeat every interval",
      }),
    ).toHaveValue(2);
    expect(
      within(recurrenceMenu).getByRole("combobox", {
        name: "Repeat every frequency",
      }),
    ).toHaveTextContent("Months");
    await userEvent.click(
      within(recurrenceMenu).getByRole("option", {
        name: "Custom recurrence…",
      }),
    );
    await waitFor(() =>
      expect(
        page.queryByRole("dialog", { name: "Choose task recurrence" }),
      ).not.toBeInTheDocument(),
    );
    const recurrenceDialog = page.getByRole("dialog", {
      name: "Custom recurrence",
    });
    await waitFor(() => expect(recurrenceDialog).toBeVisible());
    const recurrenceRect = recurrenceDialog.getBoundingClientRect();
    expect(recurrenceRect.width).toBeLessThanOrEqual(520);
    expect(recurrenceRect.top).toBeLessThan(2);
    expect(
      Math.abs(recurrenceRect.height - canvasElement.ownerDocument.defaultView!.innerHeight),
    ).toBeLessThan(2);
    expect(parseFloat(getComputedStyle(recurrenceDialog).borderRadius)).toBe(0);
    const interval = within(recurrenceDialog).getByRole("spinbutton", {
      name: "Recurrence interval",
    });
    await userEvent.clear(interval);
    await userEvent.type(interval, "2");
    const frequencySelect = within(recurrenceDialog).getByRole("combobox", {
      name: "Recurrence frequency",
    });
    expect(frequencySelect.tagName).toBe("BUTTON");
    await userEvent.click(frequencySelect);
    await userEvent.click(
      within(
        page.getByRole("listbox", {
          name: "Recurrence frequency options",
        }),
      ).getByRole("option", { name: "Months" }),
    );
    const anchorSelect = within(recurrenceDialog).getByRole("combobox", {
      name: "Recurrence anchor",
    });
    expect(anchorSelect.tagName).toBe("BUTTON");
    await userEvent.click(anchorSelect);
    await userEvent.click(
      within(
        page.getByRole("listbox", {
          name: "Recurrence anchor options",
        }),
      ).getByRole("option", { name: "Completion date" }),
    );
    await userEvent.click(
      within(recurrenceDialog).getByRole("switch", {
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
        rrule: "FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=22",
        anchor: "completion",
        missed: "carry",
        resetChecklist: true,
        lastCompletedAt: "2026-08-18T09:15:00.000Z",
        completionCount: 4,
      }),
    );

    const statusButton = canvas.getByRole("button", { name: "Task status" });
    await waitForPointerInteraction(statusButton);
    await userEvent.click(statusButton);
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
    expect(within(recurrenceDialog).queryByText("Presets")).not.toBeInTheDocument();
    expect(
      within(recurrenceDialog).getByRole("button", { name: "Repeat every" }),
    ).toHaveAttribute("aria-expanded", "false");
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

    const recurrenceTrigger = canvas.getByRole("button", {
      name: "Set task recurrence",
    });
    await waitForPointerInteraction(recurrenceTrigger);
    await userEvent.click(recurrenceTrigger);
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
        rrule: "FREQ=WEEKLY",
        anchor: "schedule",
        missed: "carry",
      });
    });

    await waitForPointerInteraction(recurrenceTrigger);
    await userEvent.click(recurrenceTrigger);
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
  name="Custom tracked recurrence"
  tags={["test", "visual-pending"]}
  parameters={{ a11y: { test: "off" } }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const state = () =>
      JSON.parse(canvas.getByTestId("task-preview-state").textContent ?? "{}") as Record<string, unknown>;

    await userEvent.click(canvas.getByRole("button", { name: "Set task recurrence" }));
    const recurrenceMenu = page.getByRole("dialog", {
      name: "Choose task recurrence",
    });
    await userEvent.click(
      within(recurrenceMenu).getByRole("option", {
        name: "Custom recurrence…",
      }),
    );
    const dialog = page.getByRole("dialog", { name: "Custom recurrence" });
    const customForm = within(dialog).getByRole("form", {
      name: "Custom recurrence form",
    });
    const naturalRule = within(customForm).getByRole("combobox", {
      name: "Describe recurrence",
    });
    await userEvent.type(
      naturalRule,
      "every 2 weeks on Monday, Wednesday, and Friday",
    );
    await userEvent.click(
      within(customForm).getByRole("option", {
        name: /Every 2 weeks on Monday, Wednesday, Friday/,
      }),
    );
    expect(
      within(customForm).getByRole("switch", { name: "Edit raw RRULE" }),
    ).not.toBeChecked();
    expect(
      within(customForm).getByRole("combobox", {
        name: "Recurrence frequency",
      }),
    ).toHaveTextContent("Weeks");
    expect(
      within(customForm).getByRole("spinbutton", {
        name: "Recurrence interval",
      }),
    ).toHaveValue(2);
    expect(state().repeat).toMatchObject({ rrule: "FREQ=DAILY;INTERVAL=2" });
    for (const day of ["Monday", "Wednesday", "Friday"]) {
      const weekday = within(customForm).getByRole("button", { name: day });
      expect(weekday).toHaveAttribute("aria-pressed", "true");
    }
    const tuesday = within(customForm).getByRole("button", { name: "Tuesday" });
    expect(tuesday).toHaveTextContent(/Tue\s*18/);
    expect(tuesday).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(tuesday);
    expect(tuesday).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(tuesday);
    expect(tuesday).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(
      within(customForm).getByRole("combobox", {
        name: "Recurrence end condition",
      }),
    );
    await userEvent.click(
      within(
        page.getByRole("listbox", {
          name: "Recurrence end condition options",
        }),
      ).getByRole("option", { name: "On date" }),
    );
    const until = within(customForm).getByLabelText("Recurrence until");
    await fireEvent.change(until, { target: { value: "2026-09-30" } });
    await userEvent.type(until, "{Enter}");
    expect(dialog).toBeVisible();
    expect(state().repeat).toMatchObject({ rrule: "FREQ=DAILY;INTERVAL=2" });
    await userEvent.click(
      within(customForm).getByRole("combobox", {
        name: "Recurrence end condition",
      }),
    );
    await userEvent.click(
      within(
        page.getByRole("listbox", {
          name: "Recurrence end condition options",
        }),
      ).getByRole("option", { name: "After count" }),
    );
    const count = within(customForm).getByRole("spinbutton", {
      name: "Recurrence count",
    });
    await userEvent.clear(count);
    await userEvent.type(count, "12");
    const anchorSelect = within(customForm).getByRole("combobox", {
      name: "Recurrence anchor",
    });
    await userEvent.click(anchorSelect);
    await userEvent.click(
      within(page.getByRole("listbox", { name: "Recurrence anchor options" }))
        .getByRole("option", { name: "Scheduled date" }),
    );
    const additionalDates = within(customForm).getByRole("combobox", {
      name: "Additional recurrence dates",
    });
    await userEvent.click(additionalDates);
    await userEvent.type(additionalDates, "tom");
    await userEvent.click(
      page.getByRole("option", { name: "Tomorrow" }),
    );
    expect(dialog).toBeVisible();
    expect(state().repeat).toMatchObject({ rrule: "FREQ=DAILY;INTERVAL=2" });
    await userEvent.type(
      additionalDates,
      "not a date{Enter}",
    );
    expect(within(customForm).getByRole("alert")).toHaveTextContent(
      "could not understand",
    );
    expect(
      within(customForm).getByRole("button", { name: "Remove 2026-08-22" }),
    ).toBeVisible();
    await userEvent.type(
      within(customForm).getByRole("combobox", { name: "Excluded recurrence dates" }),
      "2026-09-03{Enter}",
    );
    await userEvent.click(
      within(customForm).getByRole("switch", { name: "Pause recurrence" }),
    );
    await userEvent.click(
      within(customForm).getByRole("button", { name: "Select Tracking type" }),
    );
    await userEvent.click(
      within(
        within(customForm).getByRole("listbox", { name: "Tracking type options" }),
      ).getByRole("option", { name: "Count" }),
    );
    await userEvent.type(
      within(customForm).getByRole("textbox", { name: "Tracking unit" }),
      "glasses",
    );
    await userEvent.type(
      within(customForm).getByRole("spinbutton", { name: "Tracking target" }),
      "8",
    );
    await userEvent.click(
      within(customForm).getByRole("button", { name: "Apply recurrence" }),
    );
    await waitFor(() => {
      expect(state().repeat).toMatchObject({
        start: "2026-08-21",
        rrule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;COUNT=12",
        anchor: "schedule",
        missed: "carry",
        rdate: ["2026-08-22"],
        exdate: ["2026-09-03"],
        paused: true,
        pausedSince: "2026-08-21",
      });
      expect(state().tracking).toEqual({
        type: "count",
        unit: "glasses",
        target: 8,
      });
      expect(state().planDate).toBe("2026-08-21");
    });
    await waitFor(() =>
      expect(
        page.queryByRole("dialog", { name: "Custom recurrence" }),
      ).not.toBeInTheDocument(),
    );
    await waitForPointerInteraction(
      canvas.getByRole("button", { name: "Set task recurrence" }),
    );
    expect(
      canvas.getByRole("button", { name: "Set task recurrence" }),
    ).toHaveTextContent(
      "Every 2 weeks on Monday, Wednesday, Friday for 12 times",
    );
  }}
>
  {#snippet template()}
    <ApplicationTaskPreviewRowSampleStory expandedByDefault recurringByDefault />
  {/snippet}
</Story>

<Story
  name="Unsupported raw recurrence"
  tags={["test", "visual-pending"]}
  parameters={{ a11y: { test: "off" } }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const state = () =>
      JSON.parse(canvas.getByTestId("task-preview-state").textContent ?? "{}") as Record<string, unknown>;

    await userEvent.click(canvas.getByRole("button", { name: "Set task recurrence" }));
    let recurrenceMenu = page.getByRole("dialog", {
      name: "Choose task recurrence",
    });
    await userEvent.click(
      within(recurrenceMenu).getByRole("option", {
        name: "Custom recurrence…",
      }),
    );
    let dialog = page.getByRole("dialog", { name: "Custom recurrence" });
    await userEvent.click(within(dialog).getByRole("switch", { name: "Edit raw RRULE" }));
    const raw = within(dialog).getByRole("textbox", { name: "Raw RRULE" });
    await userEvent.clear(raw);
    await userEvent.type(raw, "FREQ=DAILY;BYHOUR=9");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Apply recurrence" }),
    );
    await waitFor(() =>
      expect(state().repeat).toMatchObject({ rrule: "FREQ=DAILY;BYHOUR=9" }),
    );
    await waitFor(() =>
      expect(
        page.queryByRole("dialog", { name: "Custom recurrence" }),
      ).not.toBeInTheDocument(),
    );

    const recurrenceTrigger = canvas.getByRole("button", {
      name: "Set task recurrence",
    });
    await waitForPointerInteraction(recurrenceTrigger);
    await userEvent.click(recurrenceTrigger);
    recurrenceMenu = page.getByRole("dialog", { name: "Choose task recurrence" });
    expect(within(recurrenceMenu).getByRole("alert")).toHaveTextContent(
      "Automatic advancement is blocked",
    );
  }}
>
  {#snippet template()}
    <ApplicationTaskPreviewRowSampleStory expandedByDefault recurringByDefault />
  {/snippet}
</Story>

<Story
  name="Legacy recurrence replacement"
  tags={["test", "visual-pending"]}
  parameters={{ a11y: { test: "off" } }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const state = () =>
      JSON.parse(canvas.getByTestId("task-preview-state").textContent ?? "{}") as Record<string, unknown>;

    await userEvent.click(canvas.getByRole("button", { name: "Set task recurrence" }));
    const dialog = page.getByRole("dialog", { name: "Choose task recurrence" });
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Legacy or invalid recurrence",
    );
    expect(within(dialog).getByText(/frequency/)).toBeVisible();
    await userEvent.click(within(dialog).getByRole("option", { name: "Daily" }));
    await waitFor(() => {
      expect(state().repeat).toMatchObject({ rrule: "FREQ=DAILY" });
      expect(state().unparsedRepeat).toBeUndefined();
    });
  }}
>
  {#snippet template()}
    <ApplicationTaskPreviewRowSampleStory expandedByDefault invalidRecurrenceByDefault />
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
