<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskAtFormFieldExample } from "../../catalog.example-sources";
  import ApplicationTaskAtFormField from "./ApplicationTaskAtFormField.svelte";
  import {
    formatTaskPlanAtLabel,
    type TaskCatalogPlanAt,
    type TaskWhen,
  } from "../../model";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Due, When, and Area/At Form Field",
    component: ApplicationTaskAtFormField,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskAtFormFieldExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component: "Planner form field wrapping the plan.at day-part dropdown.",
        },
      },
    },
  });
</script>

<script lang="ts">
  type AtValue = {
    scheduledAt?: string;
    when?: TaskWhen;
    planDate?: string;
    planAt?: TaskCatalogPlanAt;
  };

  let value = $state<AtValue>({
    scheduledAt: "2026-08-20",
    planDate: "2026-08-20",
    planAt: "morning",
  });

  const selectedLabel = $derived(formatTaskPlanAtLabel(value));
</script>

<Story name="Default" tags={["visual-pending"]} parameters={{ docs: { description: { story: "Default catalog sample for the At form field." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm task-at-form-field-story">
      <ApplicationTaskAtFormField
        {value}
        update={(next) => {
          value = next;
        }}
      />
      <p class="task-at-form-field-story__selected" aria-live="polite">
        Selected: <strong>{selectedLabel}</strong>
      </p>
    </div>
  {/snippet}
</Story>

<style>
  .task-at-form-field-story {
    display: grid;
    gap: 0.75rem;
    justify-items: start;
  }

  .task-at-form-field-story__selected {
    margin: 0;
    color: var(--muted-foreground, #64748b);
    font-size: 0.8rem;
    font-weight: 550;
  }

  .task-at-form-field-story__selected strong {
    color: var(--foreground, #0f172a);
    font-weight: 700;
  }
</style>
