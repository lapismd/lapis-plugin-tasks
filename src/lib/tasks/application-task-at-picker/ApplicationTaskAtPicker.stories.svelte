<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
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

<Story name="Day parts" tags={["visual-pending"]} parameters={{ docs: { description: { story: "At picker with morning, afternoon, evening, and anytime." } } }}>
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
