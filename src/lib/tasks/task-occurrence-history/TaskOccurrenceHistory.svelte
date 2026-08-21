<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import CircleEllipsisIcon from "@lucide/svelte/icons/circle-ellipsis";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import {
    filterTaskOccurrenceHistory,
    formatDuration,
    type TaskOccurrenceHistoryFilter,
    type TaskOccurrenceHistoryRow,
  } from "../../model";

  let { rows = [] }: { rows?: TaskOccurrenceHistoryRow[] } = $props();
  let filter = $state<TaskOccurrenceHistoryFilter>("all");
  const visibleRows = $derived(filterTaskOccurrenceHistory(rows, filter));

  function valueLabel(row: TaskOccurrenceHistoryRow): string | null {
    if (row.durationMinutes != null) return formatDuration(row.durationMinutes) ?? null;
    if (row.value != null) return `${row.value}${row.unit ? ` ${row.unit}` : ""}`;
    return null;
  }
</script>

<section class="task-occurrence-history" aria-label="Task occurrence history">
  <div class="task-occurrence-history__filters" role="group" aria-label="History filter">
    {#each ["all", "completed", "missed"] as option}
      <button
        type="button"
        class:task-occurrence-history__filter--active={filter === option}
        aria-pressed={filter === option}
        onclick={() => (filter = option as TaskOccurrenceHistoryFilter)}
      >
        {option[0]?.toUpperCase()}{option.slice(1)}
      </button>
    {/each}
  </div>

  {#if visibleRows.length}
    <ul>
      {#each visibleRows as row (row.id)}
        <li data-outcome={row.outcome}>
          <span class="task-occurrence-history__status" aria-hidden="true">
            {#if row.outcome === "completed"}
              <CheckIcon />
            {:else if row.outcome === "missed"}
              <CircleAlertIcon />
            {:else if row.outcome === "unrecorded"}
              <CircleEllipsisIcon />
            {:else}
              <ClockIcon />
            {/if}
          </span>
          <span class="task-occurrence-history__body">
            <strong>{row.title}</strong>
            <small>{row.outcome}</small>
          </span>
          {#if valueLabel(row)}
            <span class="task-occurrence-history__value">{valueLabel(row)}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="task-occurrence-history__empty">
      {filter === "all" ? "No expected recurring tasks" : `No ${filter} occurrences`}
    </p>
  {/if}
</section>

<style>
  .task-occurrence-history {
    display: grid;
    gap: 0.75rem;
    padding: 0.85rem;
  }
  .task-occurrence-history__filters { display: flex; gap: 0.35rem; }
  .task-occurrence-history__filters button {
    min-height: 2rem;
    padding: 0 0.7rem;
    border: 1px solid var(--ui-border, #d1d5db);
    border-radius: 999px;
    background: transparent;
    color: var(--ui-text-primary, #374151);
    font: inherit;
    font-size: 0.78rem;
    cursor: pointer;
  }
  .task-occurrence-history__filters .task-occurrence-history__filter--active {
    border-color: var(--ui-accent, #4f46e5);
    background: color-mix(in srgb, var(--ui-accent, #4f46e5) 12%, transparent);
    color: var(--ui-text-primary, #111827);
  }
  ul { display: grid; gap: 0.4rem; margin: 0; padding: 0; list-style: none; }
  li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.65rem;
    min-height: 3rem;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--ui-border, #e5e7eb);
    border-radius: 0.6rem;
  }
  .task-occurrence-history__status {
    display: inline-flex;
    width: 1.1rem;
    height: 1.1rem;
    color: var(--ui-text-primary, #374151);
  }
  li[data-outcome="completed"] .task-occurrence-history__status { color: var(--ui-success-text, #15803d); }
  li[data-outcome="missed"] .task-occurrence-history__status,
  li[data-outcome="unrecorded"] .task-occurrence-history__status { color: var(--ui-warning-text, #b45309); }
  .task-occurrence-history__status :global(svg) { width: 100%; height: 100%; }
  .task-occurrence-history__body { display: grid; min-width: 0; }
  strong {
    overflow: hidden;
    color: var(--ui-text-primary, #111827);
    font-size: 0.88rem;
    font-weight: 550;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    color: var(--ui-text-primary, #374151);
    font-size: 0.72rem;
    text-transform: capitalize;
  }
  .task-occurrence-history__value {
    color: var(--ui-text-primary, #111827);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
  }
  .task-occurrence-history__empty {
    margin: 1.5rem 0;
    color: var(--ui-text-secondary, #6b7280);
    text-align: center;
  }
</style>
