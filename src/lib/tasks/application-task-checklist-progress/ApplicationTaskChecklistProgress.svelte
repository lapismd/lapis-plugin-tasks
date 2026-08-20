<script lang="ts">
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

  import {
    taskBodyExcerpt,
    type ApplicationTask,
    type ChecklistItem,
  } from "../../model";
  import ApplicationTaskCheckbox from "../application-task-checkbox/ApplicationTaskCheckbox.svelte";
  import "./ApplicationTaskChecklistProgress.css";

  let {
    task,
    onLoadChecklist,
    onToggleChecklistItem,
    checklistRefreshVersion = 0,
    layout = "inline",
    class: className = "",
  }: {
    task: ApplicationTask;
    onLoadChecklist?: () => Promise<ChecklistItem[]>;
    onToggleChecklistItem?: (
      item: ChecklistItem,
      checked: boolean,
    ) => Promise<ChecklistItem[]>;
    checklistRefreshVersion?: number;
    layout?: "inline" | "planner";
    class?: string;
  } = $props();

  let expanded = $state(false);
  let items = $state<ChecklistItem[] | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let loadedRevision = $state<string | null>(null);
  let pendingPositions = $state<Set<number>>(new Set());

  const title = $derived(taskBodyExcerpt(task.body));
  const total = $derived(task.checklistTotal ?? 0);
  const completed = $derived(
    items
      ? items.filter((item) => item.checked).length
      : (task.checklistCompleted ?? 0),
  );
  const progress = $derived(
    total > 0 ? Math.round((completed / total) * 100) : 0,
  );
  const revision = $derived(
    `${checklistRefreshVersion}:${task.updatedAt ?? ""}:${task.checklistCompleted ?? 0}:${task.checklistTotal ?? 0}`,
  );

  async function loadChecklist(options: { keepError?: boolean } = {}) {
    if (!onLoadChecklist) {
      error = "Checklist details are unavailable.";
      return;
    }
    loading = true;
    if (!options.keepError) error = null;
    try {
      items = await onLoadChecklist();
      loadedRevision = revision;
    } catch (loadError) {
      error =
        loadError instanceof Error ? loadError.message : String(loadError);
    } finally {
      loading = false;
    }
  }

  async function toggleDisclosure(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    expanded = !expanded;
    if (expanded && items === null) await loadChecklist();
  }

  async function toggleItem(item: ChecklistItem, checked: boolean) {
    if (!items || !onToggleChecklistItem) return;
    const previous = items;
    error = null;
    items = items.map((entry) =>
      entry.position === item.position ? { ...entry, checked } : entry,
    );
    pendingPositions = new Set([...pendingPositions, item.position]);
    try {
      items = await onToggleChecklistItem(item, checked);
      loadedRevision = revision;
    } catch (toggleError) {
      items = previous;
      await loadChecklist({ keepError: true });
      error =
        toggleError instanceof Error
          ? toggleError.message
          : "The checklist could not be updated.";
    } finally {
      const next = new Set(pendingPositions);
      next.delete(item.position);
      pendingPositions = next;
    }
  }

  $effect(() => {
    const currentRevision = revision;
    if (
      expanded &&
      items !== null &&
      loadedRevision !== null &&
      loadedRevision !== currentRevision &&
      !loading &&
      pendingPositions.size === 0
    ) {
      void loadChecklist();
    }
  });
</script>

{#if total > 0}
  <div
    class={["task-checklist-progress", className].filter(Boolean).join(" ")}
    data-task-checklist-progress
    data-layout={layout}
  >
    <button
      type="button"
      class="task-checklist-progress__summary"
      aria-expanded={expanded}
      aria-controls={`task-checklist-${task.id}`}
      aria-label={`${expanded ? "Hide" : "Show"} checklist for ${title}`}
      onclick={toggleDisclosure}
    >
      <span
        class="task-checklist-progress__track"
        role="progressbar"
        aria-label={`Checklist progress: ${completed} of ${total}`}
        aria-valuemin="0"
        aria-valuemax={total}
        aria-valuenow={completed}
      >
        <span style={`width: ${progress}%`}></span>
      </span>
      <span class="task-checklist-progress__count">{completed} / {total}</span>
      <ChevronDownIcon aria-hidden="true" />
    </button>
    {#if expanded}
      <div
        id={`task-checklist-${task.id}`}
        class="task-checklist-progress__items"
        role="group"
        aria-label={`Checklist for ${title}`}
        aria-busy={loading}
      >
        {#if loading && items === null}
          <span class="task-checklist-progress__state">Loading checklist…</span>
        {:else if items}
          {#each items as item (item.position)}
            <label>
              <ApplicationTaskCheckbox
                checked={item.checked}
                label={item.text}
                class="task-checklist-progress__control"
                disabled={pendingPositions.has(item.position)}
                onchange={(event) =>
                  void toggleItem(
                    item,
                    (event.currentTarget as HTMLInputElement).checked,
                  )}
              />
              <span class:task-checklist-progress__item--done={item.checked}>
                {item.text}
              </span>
            </label>
          {/each}
        {/if}
        {#if error}
          <span class="task-checklist-progress__error" role="alert">
            {error}
          </span>
        {/if}
      </div>
    {/if}
  </div>
{/if}
