<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import { ApplicationTaskWhenPickerExample } from "../../catalog.example-sources";
  import ApplicationTaskWhenPicker from "./ApplicationTaskWhenPicker.svelte";
  import {
    formatShortTaskDate,
    resolveTaskPlannerPlacement,
    type TaskPlannerQuickPlacement,
    type TaskWhen,
  } from "../../model";

  const { Story } = defineMeta({
    title: "Plugins/Tasks/Due, When, and Area/When Picker",
    component: ApplicationTaskWhenPicker,
    parameters: {
      docs: {
        source: {
          code: ApplicationTaskWhenPickerExample,
          language: "svelte",
          type: "code",
        },
        description: {
          component:
            "Schedule and due-date picker control for application tasks (mode + variant).",
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
  let duePillAt = $state<string | null>("2026-07-02");
  let dueFooterAt = $state<string | null>("2026-07-02");

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

  const duePillLabel = $derived(
    duePillAt ? formatShortTaskDate(duePillAt) : "None",
  );
  const dueFooterLabel = $derived(
    dueFooterAt ? formatShortTaskDate(dueFooterAt) : "None",
  );

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

  function selectDuePill(date: string) {
    duePillAt = date;
  }

  function clearDuePill() {
    duePillAt = null;
  }

  function selectDueFooter(date: string) {
    dueFooterAt = date;
  }

  function clearDueFooter() {
    dueFooterAt = null;
  }
</script>

<Story name="Today bucket" tags={["visual-pending"]} parameters={{ docs: { description: { story: "When picker opened on the today bucket." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm task-when-picker-story">
      <ApplicationTaskWhenPicker
        {when}
        {scheduledAt}
        {planAt}
        onSelectPlacement={selectPlacement}
        onSelectDate={selectDate}
        onClear={clearSchedule}
      />
      <p class="task-when-picker-story__selected" aria-live="polite">
        Selected: <strong>{selectedLabel}</strong>
        {#if scheduledAt}
          <span class="task-when-picker-story__meta">({scheduledAt})</span>
        {:else if when}
          <span class="task-when-picker-story__meta">({when})</span>
        {/if}
      </p>
    </div>
  {/snippet}
</Story>

<Story name="Due date pill" tags={["visual-pending"]} parameters={{ docs: { description: { story: "Due-date control using the compact pill variant." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm task-when-picker-story">
      <ApplicationTaskWhenPicker
        mode="due"
        variant="pill"
        scheduledAt={duePillAt}
        onSelectDate={selectDuePill}
        onClear={clearDuePill}
      />
      <p class="task-when-picker-story__selected" aria-live="polite">
        Selected: <strong>{duePillLabel}</strong>
        {#if duePillAt}
          <span class="task-when-picker-story__meta">({duePillAt})</span>
        {/if}
      </p>
    </div>
  {/snippet}
</Story>

<Story name="Due date footer" tags={["visual-pending"]} parameters={{ docs: { description: { story: "Due-date control using the footer variant." } } }}>
  {#snippet template()}
    <div class="task-story-frame task-story-frame--sm task-when-picker-story">
      <ApplicationTaskWhenPicker
        mode="due"
        variant="footer"
        scheduledAt={dueFooterAt}
        onSelectDate={selectDueFooter}
        onClear={clearDueFooter}
      />
      <p class="task-when-picker-story__selected" aria-live="polite">
        Selected: <strong>{dueFooterLabel}</strong>
        {#if dueFooterAt}
          <span class="task-when-picker-story__meta">({dueFooterAt})</span>
        {/if}
      </p>
    </div>
  {/snippet}
</Story>

<style>
  .task-when-picker-story {
    display: grid;
    gap: 0.75rem;
    justify-items: start;
  }

  .task-when-picker-story__selected {
    margin: 0;
    color: var(--muted-foreground, #64748b);
    font-size: 0.8rem;
    font-weight: 550;
  }

  .task-when-picker-story__selected strong {
    color: var(--foreground, #0f172a);
    font-weight: 700;
  }

  .task-when-picker-story__meta {
    margin-inline-start: 0.25rem;
    font-weight: 500;
  }
</style>
