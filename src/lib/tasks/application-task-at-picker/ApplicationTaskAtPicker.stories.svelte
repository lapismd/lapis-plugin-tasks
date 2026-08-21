<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { expect, userEvent, within } from "storybook/test";
  import { ApplicationTaskAtPickerExample } from "../../catalog.example-sources";
  import ApplicationTaskAtPicker from "./ApplicationTaskAtPicker.svelte";
  import {
    formatTaskPlanAtLabel,
    type TaskPlanAtDayPart,
    type TaskWhen,
  } from "../../model";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Due, When, and Area/At Picker",
    component: ApplicationTaskAtPicker,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskAtPickerExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component:
            "Day-part dropdown for task plan.at: morning, afternoon, evening, or anytime.",
        },
      },
    },
  });
</script>

<script lang="ts">
  let when = $state<TaskWhen | null>(null);
  let planAt = $state<string | null>("anytime");

  const selectedLabel = $derived(formatTaskPlanAtLabel({ when, planAt }));

  function selectAt(at: TaskPlanAtDayPart) {
    planAt = at;
    when = at === "evening" ? "this-evening" : null;
  }
</script>

<Story
  name="Day parts"
  tags={["test", "visual-pending"]}
  parameters={{ docs: { description: { story: "At picker with compact section titles and two-column day-part and shortcut grids." } } }}
  play={async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const view = canvasElement.ownerDocument.defaultView;

    await userEvent.click(
      canvas.getByRole("button", { name: "Set planner day part" }),
    );
    const dialog = page.getByRole("dialog", {
      name: "Choose planner day part",
    });
    const dayParts = within(dialog).getByRole("group", { name: "Day parts" });
    const shortcuts = within(dialog).getByRole("group", { name: "Shortcuts" });
    const columnCount = (element: HTMLElement) =>
      view
        ?.getComputedStyle(element)
        .gridTemplateColumns.split(" ")
        .filter(Boolean).length ?? 0;

    expect(view?.getComputedStyle(dayParts).display).toBe("grid");
    expect(columnCount(dayParts)).toBe(2);
    expect(view?.getComputedStyle(shortcuts).display).toBe("grid");
    expect(columnCount(shortcuts)).toBe(2);
    expect(
      Number.parseFloat(
        view?.getComputedStyle(within(dialog).getByText("Day parts")).fontSize ??
          "0",
      ),
    ).toBeLessThan(12);
    expect(
      Number.parseFloat(
        view?.getComputedStyle(within(dialog).getByText("Custom time")).fontSize ??
          "0",
      ),
    ).toBeLessThan(12);
  }}
>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm task-at-picker-story">
      <ApplicationTaskAtPicker
        {when}
        {planAt}
        onSelect={selectAt}
      />
      <p class="task-at-picker-story__selected" aria-live="polite">
        Selected: <strong>{selectedLabel}</strong>
      </p>
    </div>
  {/snippet}
</Story>

<style>
  .task-at-picker-story {
    display: grid;
    gap: 0.75rem;
    justify-items: start;
  }

  .task-at-picker-story__selected {
    margin: 0;
    color: var(--muted-foreground, #64748b);
    font-size: 0.8rem;
    font-weight: 550;
  }

  .task-at-picker-story__selected strong {
    color: var(--foreground, #0f172a);
    font-weight: 700;
  }
</style>
