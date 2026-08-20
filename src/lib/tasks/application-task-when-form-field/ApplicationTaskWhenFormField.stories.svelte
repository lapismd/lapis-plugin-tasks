<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskWhenFormFieldExample } from "../../catalog.example-sources";
  import ApplicationTaskWhenFormField from "./ApplicationTaskWhenFormField.svelte";
  import {
    formatShortTaskDate,
    formatTaskScheduleLabel,
    type TaskWhen,
  } from "../../model";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Due, When, and Area/When Form Field",
    component: ApplicationTaskWhenFormField,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskWhenFormFieldExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component:
            "Schedule and due-date form field wrapping the task when picker (mode + variant).",
        },
      },
    },
  });
</script>

<script lang="ts">
  type ScheduleValue = {
    scheduledAt?: string;
    when?: TaskWhen;
    planAt?: string;
  };

  let scheduleValue = $state<ScheduleValue>({ when: "today" });
  let duePillAt = $state<string | null>("2026-07-02");
  let dueFooterAt = $state<string | null>("2026-07-02");

  const scheduleLabel = $derived(
    formatTaskScheduleLabel(scheduleValue) ?? "None",
  );

  const duePillLabel = $derived(
    duePillAt ? formatShortTaskDate(duePillAt) : "None",
  );
  const dueFooterLabel = $derived(
    dueFooterAt ? formatShortTaskDate(dueFooterAt) : "None",
  );

  function updateSchedule(value: ScheduleValue) {
    scheduleValue = value;
  }

  function updateDuePill(date: string | null) {
    duePillAt = date;
  }

  function updateDueFooter(date: string | null) {
    dueFooterAt = date;
  }
</script>

<Story name="Default" tags={["visual-pending"]} parameters={{ docs: { description: { story: "Default catalog sample for this control." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm task-when-form-field-story">
      <ApplicationTaskWhenFormField
        value={scheduleValue}
        update={updateSchedule}
      />
      <p class="task-when-form-field-story__selected" aria-live="polite">
        Selected: <strong>{scheduleLabel}</strong>
      </p>
    </div>
  {/snippet}
</Story>

<Story name="Due date pill" tags={["visual-pending"]} parameters={{ docs: { description: { story: "Due-date control using the compact pill variant." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm task-when-form-field-story">
      <ApplicationTaskWhenFormField
        mode="due"
        variant="pill"
        value={duePillAt}
        update={updateDuePill}
      />
      <p class="task-when-form-field-story__selected" aria-live="polite">
        Selected: <strong>{duePillLabel}</strong>
        {#if duePillAt}
          <span class="task-when-form-field-story__meta">({duePillAt})</span>
        {/if}
      </p>
    </div>
  {/snippet}
</Story>

<Story name="Due date footer" tags={["visual-pending"]} parameters={{ docs: { description: { story: "Due-date control using the footer variant." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm task-when-form-field-story">
      <ApplicationTaskWhenFormField
        mode="due"
        variant="footer"
        value={dueFooterAt}
        update={updateDueFooter}
      />
      <p class="task-when-form-field-story__selected" aria-live="polite">
        Selected: <strong>{dueFooterLabel}</strong>
        {#if dueFooterAt}
          <span class="task-when-form-field-story__meta">({dueFooterAt})</span>
        {/if}
      </p>
    </div>
  {/snippet}
</Story>

<style>
  .task-when-form-field-story {
    display: grid;
    gap: 0.75rem;
    justify-items: start;
  }

  .task-when-form-field-story__selected {
    margin: 0;
    color: var(--muted-foreground, #64748b);
    font-size: 0.8rem;
    font-weight: 550;
  }

  .task-when-form-field-story__selected strong {
    color: var(--foreground, #0f172a);
    font-weight: 700;
  }

  .task-when-form-field-story__meta {
    margin-inline-start: 0.25rem;
    font-weight: 500;
  }
</style>
