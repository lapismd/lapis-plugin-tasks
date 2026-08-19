<script lang="ts">
  import { ReferencePicker, type ReferenceIndex } from "@lapismd/design-core/forms";
  import { buildApplicationTaskReferenceIndex } from '../lib/references';
  import {
    appendApplicationTask,
    createApplicationTask,
    draftApplicationTask,
    taskForReferenceRef,
    taskForReferenceTarget,
    taskReferenceForTask,
  } from '../lib/references-task';
  import type { JobApplication } from '../../model';
  import ApplicationTaskLine from "../application-task-line/ApplicationTaskLine.svelte";
  import ApplicationTaskPreviewRow from "../application-task-preview-row/ApplicationTaskPreviewRow.svelte";

  let {
    application,
    referenceIndex: referenceIndexProp,
    refs = [],
    excludedRefs = [],
    addOpen = false,
    addButtonClass = "",
    addLabel = "Add Task Reference",
    addHeading = "Task Reference",
    searchPlaceholder = "Search application tasks...",
    unresolvedLabel = "Unresolved task reference",
    unresolvedDescription = "Keep this reference or remove it after updating application tasks.",
    onAddOpenChange = () => {},
    onSave,
    onChange,
  }: {
    application: JobApplication;
    referenceIndex?: ReferenceIndex;
    refs?: string[];
    excludedRefs?: string[];
    addOpen?: boolean;
    addButtonClass?: string;
    addLabel?: string;
    addHeading?: string;
    searchPlaceholder?: string;
    unresolvedLabel?: string;
    unresolvedDescription?: string;
    onAddOpenChange?: (open: boolean) => void;
    onSave?: (application: JobApplication) => void;
    onChange: (refs: string[]) => void;
  } = $props();

  let pendingApplication = $state<JobApplication | null>(null);

  const activeApplication = $derived(pendingApplication ?? application);
  const referenceIndex = $derived(
    referenceIndexProp ?? buildApplicationTaskReferenceIndex(activeApplication),
  );

  $effect(() => {
    const pending = pendingApplication;
    if (!pending) return;
    const pendingTasks = pending.tasks ?? [];
    const currentTasks = application.tasks ?? [];
    if (
      pendingTasks.every((task) =>
        currentTasks.some((entry) => entry.id === task.id),
      )
    ) {
      pendingApplication = null;
    }
  });

  function resolveTask(
    reference: Parameters<typeof taskForReferenceTarget>[1],
    ref: string,
  ) {
    return (
      taskForReferenceTarget(activeApplication, reference) ??
      taskForReferenceRef(activeApplication, ref)
    );
  }

  function handleSearchCreate(body: string) {
    if (!onSave) return null;
    const task = createApplicationTask(body);
    const nextApplication = appendApplicationTask(application, task);
    pendingApplication = nextApplication;
    onSave(nextApplication);
    return taskReferenceForTask(application.id, task.id);
  }
</script>

<div class="task-reference-picker">
  <ReferencePicker
    {refs}
    {referenceIndex}
    {excludedRefs}
    {addOpen}
    {addLabel}
    {addHeading}
    {searchPlaceholder}
    {unresolvedLabel}
    {unresolvedDescription}
    duplicateMessage="Duplicate task references are hidden until each task appears only once."
    onSearchCreate={onSave ? handleSearchCreate : undefined}
    {onAddOpenChange}
    {onChange}
  >
    {#snippet selected({ ref, reference, duplicates })}
      {#if duplicates > 0}
        <div class="task-reference-error">
          <span class="task-reference-error__ref">{ref}</span>
          <span>Duplicate task reference ({duplicates} matches)</span>
        </div>
      {:else}
        {@const task = resolveTask(reference, ref)}
        {#if task}
          <ApplicationTaskLine {task} variant="form" titleMode="text" />
        {:else}
          <div class="task-reference-error">
            <span class="task-reference-error__ref">{ref}</span>
            <span>{unresolvedLabel}</span>
          </div>
        {/if}
      {/if}
    {/snippet}

    {#snippet searchOption(reference)}
      {@const task = taskForReferenceTarget(activeApplication, reference)}
      {#if task}
        <ApplicationTaskLine {task} variant="form" titleMode="text" />
      {/if}
    {/snippet}

    {#snippet searchCreate(query)}
      <ApplicationTaskLine
        task={draftApplicationTask(query)}
        variant="form"
        titleMode="text"
        optionAction="Create task"
      />
    {/snippet}

    {#snippet preview(reference)}
      {@const task = taskForReferenceTarget(activeApplication, reference)}
      {#if task}
        <ApplicationTaskPreviewRow {task} readonly embedded isExpanded={true} />
      {:else}
        <p class="task-reference-error">{unresolvedDescription}</p>
      {/if}
    {/snippet}
  </ReferencePicker>
</div>

<style>
  .task-reference-picker {
    min-width: 0;
  }

  .task-reference-picker :global(.cv-reference-row--custom) {
    align-items: center;
    min-height: 2.5rem;
    padding: 0.28rem 1.55rem 0.28rem 1.15rem;
  }

  .task-reference-picker
    :global(.cv-reference-row-group:has(.cv-reference-preview) .cv-reference-row--custom) {
    border-bottom-color: transparent;
  }

  .task-reference-picker :global(.cv-reference-preview) {
    border-bottom: 1px solid var(--cv-form-border, var(--kanban-border, var(--border)));
    padding: 0.15rem 0 0.65rem 1.15rem;
  }

  .task-reference-picker :global(.cv-reference-add) {
    gap: 0.35rem;
    padding: 0.35rem 0 0.55rem;
  }

  .task-reference-picker :global(.cv-reference-command) {
    overflow: hidden;
    border: 1px solid var(--cv-form-border, var(--kanban-border, var(--border)));
    border-radius: 0.45rem;
    background: var(--cv-form-background, var(--kanban-card, var(--background)));
  }

  .task-reference-picker :global(.cv-reference-command-input-row) {
    padding: 0.45rem 0.65rem;
  }

  .task-reference-picker :global(.cv-reference-command-list) {
    max-height: 15rem;
  }

  .task-reference-picker :global(.cv-reference-command-item--custom) {
    padding: 0.32rem 0.65rem;
  }

  .task-reference-error {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.5rem;
    color: var(--destructive, #dc2626);
    font-size: 0.75rem;
    line-height: 1.35;
  }

  .task-reference-error__ref {
    flex-shrink: 0;
    font-family: var(
      --cv-form-mono,
      ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace
    );
    font-weight: 600;
    overflow-wrap: anywhere;
  }
</style>
