<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskWhenPickerContentExample } from "../../catalog.example-sources";
  import ApplicationTaskWhenPickerContent from "./ApplicationTaskWhenPickerContent.svelte";
  import {
    formatShortTaskDate,
    resolveTaskPlannerPlacement,
    type TaskPlannerQuickPlacement,
    type TaskWhen,
  } from "../../model";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Due, When, and Area/When Picker Content",
    component: ApplicationTaskWhenPickerContent,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskWhenPickerContentExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component:
            "Schedule and due-date picker content for application tasks (mode).",
        },
      },
    },
  });
</script>

<script lang="ts">
  type QuickPlacement = TaskPlannerQuickPlacement;

  let when = $state<TaskWhen | null>("today");
  let scheduledAt = $state<string | null>(null);
  let planAt = $state<string | null>(null);
  let dueAt = $state<string | null>("2026-07-02");

  const selectedLabel = $derived.by(() => {
    if (planAt === "morning") return "This Morning";
    if (planAt === "afternoon") return "This Afternoon";
    if (when === "this-evening" || planAt === "evening") return "This Evening";
    if (when === "someday") return "Someday";
    if (when === "anytime") return "Anytime";
    if (when === "today") return "Today";
    if (scheduledAt) return formatShortTaskDate(scheduledAt);
    return "None";
  });

  const dueLabel = $derived(dueAt ? formatShortTaskDate(dueAt) : "None");

  function selectPlacement(placement: QuickPlacement) {
    const patch = resolveTaskPlannerPlacement(placement);
    when = patch.when ?? null;
    scheduledAt = patch.scheduledAt ?? null;
    planAt = patch.planAt ?? null;
  }

  function selectDate(date: string) {
    when = null;
    scheduledAt = date;
    planAt = "anytime";
  }

  function clearSchedule() {
    when = null;
    scheduledAt = null;
    planAt = null;
  }

  function selectDueDate(date: string) {
    dueAt = date;
  }

  function clearDueDate() {
    dueAt = null;
  }
</script>

<Story name="Today bucket" tags={["visual-pending"]} parameters={{ docs: { description: { story: "When picker opened on the today bucket." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm task-when-picker-content-story">
      <ApplicationTaskWhenPickerContent
        {when}
        {scheduledAt}
        {planAt}
        onSelectPlacement={selectPlacement}
        onSelectDate={selectDate}
        onClear={clearSchedule}
      />
      <p class="task-when-picker-content-story__selected" aria-live="polite">
        Selected: <strong>{selectedLabel}</strong>
        {#if scheduledAt}
          <span class="task-when-picker-content-story__meta">({scheduledAt})</span>
        {:else if when}
          <span class="task-when-picker-content-story__meta">({when})</span>
        {/if}
      </p>
    </div>
  {/snippet}
</Story>

<Story name="Due content" tags={["visual-pending"]} parameters={{ docs: { description: { story: "When-picker content showing the due calendar." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm task-when-picker-content-story">
      <ApplicationTaskWhenPickerContent
        mode="due"
        scheduledAt={dueAt}
        onSelectDate={selectDueDate}
        onClear={clearDueDate}
      />
      <p class="task-when-picker-content-story__selected" aria-live="polite">
        Selected: <strong>{dueLabel}</strong>
        {#if dueAt}
          <span class="task-when-picker-content-story__meta">({dueAt})</span>
        {/if}
      </p>
    </div>
  {/snippet}
</Story>

<style>
  .task-when-picker-content-story {
    display: grid;
    gap: 0.75rem;
    justify-items: stretch;
  }

  .task-when-picker-content-story__selected {
    margin: 0;
    color: var(--muted-foreground, #64748b);
    font-size: 0.8rem;
    font-weight: 550;
  }

  .task-when-picker-content-story__selected strong {
    color: var(--foreground, #0f172a);
    font-weight: 700;
  }

  .task-when-picker-content-story__meta {
    margin-inline-start: 0.25rem;
    font-weight: 500;
  }
</style>
