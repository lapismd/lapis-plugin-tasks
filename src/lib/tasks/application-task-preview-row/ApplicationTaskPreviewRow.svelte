<script lang="ts">
	import './ApplicationTaskPreviewRow.css';
  import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
  import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
  import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
  import CheckCircle2Icon from "@lucide/svelte/icons/check-circle-2";
  import CircleIcon from "@lucide/svelte/icons/circle";
  import EllipsisVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical";
  import GripVerticalIcon from "@lucide/svelte/icons/grip-vertical";
  import CircleXIcon from "@lucide/svelte/icons/circle-x";
  import SignalHighIcon from "@lucide/svelte/icons/signal-high";
  import SignalLowIcon from "@lucide/svelte/icons/signal-low";
  import SignalMediumIcon from "@lucide/svelte/icons/signal-medium";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import {
    createFormConfig,
    customField,
    StructuredForm,
  } from "@lapismd/design-core/forms";
  import {
    autosizeTextarea,
    type InlineOptionPickerOption,
  } from "@lapismd/design-core/forms";
  import * as SwipeItem from "@lapismd/design-core/shadcn/swipe-item";
  import type { SwipeItemOpen } from "@lapismd/design-core/shadcn/swipe-item";
  import { tick } from "svelte";

  import type { ApplicationTask, ApplicationTaskPriority } from '../../model';
  import {
    formatCompletedTimestamp,
    getDueSummary,
    taskBodyExcerpt,
  } from '../../model';
  import ApplicationTaskAreaFormField from "../application-task-area-form-field/ApplicationTaskAreaFormField.svelte";
  import ApplicationTaskInlineOptionFormField from "../application-task-inline-option-form-field/ApplicationTaskInlineOptionFormField.svelte";
  import ApplicationTaskAtFormField from "../application-task-at-form-field/ApplicationTaskAtFormField.svelte";
  import ApplicationTaskWhenFormField from "../application-task-when-form-field/ApplicationTaskWhenFormField.svelte";
  import ApplicationMarkdownPreview from "../../model/ReferenceMarkdownPreview.svelte";
  import { asSnippet } from "../../as-snippet";
  import ApplicationTaskLine from "../application-task-line/ApplicationTaskLine.svelte";

  let {
    task,
    taskIndex = 0,
    taskTotal = 1,
    sortableGroup = "open",
    dragging = false,
    isExpanded = false,
    isClosing = false,
    readonly = false,
    embedded = false,
    showFooterActions = true,
    /** When false, the parent owns SwipeItem.Root around this row. */
    ownSwipe = true,
    /** Hover circular control that opens Task details. */
    showHoverOpen = true,
    /**
     * Hover ellipsis that toggles trailing swipe actions. Requires a SwipeItem
     * root from this component (`ownSwipe`) or an ancestor.
     */
    showSwipeTrigger = true,
    /**
     * When true, plain title clicks bubble for row selection instead of
     * starting inline title edit (host detail panel is already open).
     */
    selectOnSurfaceClick = false,
    areaOptions = [],
    onDragStart = () => {},
    onTitleEditStart = () => {},
    onRequestOpen = () => {},
    onToggleDone = () => {},
    onUpdateTask = () => {},
    onRemoveTask = () => {},
    onMoveTask = () => {},
  }: {
    task: ApplicationTask;
    taskIndex?: number;
    taskTotal?: number;
    sortableGroup?: string;
    dragging?: boolean;
    isExpanded?: boolean;
    isClosing?: boolean;
    readonly?: boolean;
    embedded?: boolean;
    showFooterActions?: boolean;
    ownSwipe?: boolean;
    showHoverOpen?: boolean;
    showSwipeTrigger?: boolean;
    selectOnSurfaceClick?: boolean;
    areaOptions?: string[];
    onDragStart?: (event: PointerEvent) => void;
    onTitleEditStart?: (taskId: string) => void;
    onRequestOpen?: (
      taskId: string,
      source?: "details-button" | "inline",
    ) => void;
    onToggleDone?: (taskId: string, event: Event) => void;
    onUpdateTask?: (taskId: string, patch: Partial<ApplicationTask>) => void;
    onRemoveTask?: (taskId: string) => void;
    onMoveTask?: (taskId: string, direction: -1 | 1) => void;
  } = $props();

  const isOpenSurface = $derived(isExpanded || isClosing);
  const dueSummary = $derived(getDueSummary(task.dueAt));
  const titleExcerpt = $derived(taskBodyExcerpt(task.body));
  const canMoveUp = $derived(taskIndex > 0);
  const canMoveDown = $derived(taskIndex < taskTotal - 1);
  const showCollapsedChrome = $derived(!embedded && !isOpenSurface);
  const showSwipeActions = $derived(
    ownSwipe && showCollapsedChrome && !readonly,
  );
  const swipeEnabled = $derived(showSwipeActions && !dragging);
  const showHoverEnd = $derived(
    showCollapsedChrome && ((showSwipeTrigger && !readonly) || showHoverOpen),
  );
  let swipeOpen = $state<SwipeItemOpen>(null);

  function removeTask() {
    onRemoveTask(task.id);
  }

  function openTaskDetails(event: MouseEvent) {
    event.stopPropagation();
    onRequestOpen(task.id, "details-button");
  }

  const statusOptions: InlineOptionPickerOption[] = [
    {
      value: "open",
      label: "Open",
      icon: CircleIcon,
      accent: "var(--kanban-foreground, var(--foreground))",
    },
    {
      value: "completed",
      label: "Completed",
      icon: CheckCircle2Icon,
      accent: "#3d9a5f",
    },
    {
      value: "canceled",
      label: "Canceled",
      icon: CircleXIcon,
      accent: "#e5484d",
    },
  ];

  const priorityOptions: InlineOptionPickerOption[] = [
    {
      value: "low",
      label: "Low",
      icon: SignalLowIcon,
      accent: "#6b9bd1",
    },
    {
      value: "medium",
      label: "Medium",
      icon: SignalMediumIcon,
      accent: "var(--kanban-muted, var(--muted-foreground))",
    },
    {
      value: "high",
      label: "High",
      icon: SignalHighIcon,
      accent: "#e5484d",
    },
  ];

  const effectiveStatus = $derived(
    task.status === "canceled"
      ? "canceled"
      : task.status === "completed" || task.status === "done" || task.done
        ? "completed"
        : "open",
  );

  const footerFormConfig = createFormConfig<ApplicationTask>({
    id: "application-task-preview-footer",
    fields: [
      customField<ApplicationTask, undefined, string>({
        id: "task-preview-status",
        label: "Status",
        get: (value) =>
          value.status === "canceled"
            ? "canceled"
            : value.status === "completed" || value.status === "done" || value.done
              ? "completed"
              : "open",
        set: (value, status) => {
          const completed = status === "completed";
          return {
            ...value,
            status: status as ApplicationTask["status"],
            done: completed,
            completedAt: completed
              ? (value.completedAt ?? new Date().toISOString())
              : undefined,
          };
        },
        renderers: {
          edit: {
            component: ApplicationTaskInlineOptionFormField,
            wrapper: "none",
            props: {
              options: statusOptions,
              ariaLabel: "Task status",
            },
          },
        },
      }),
      customField<ApplicationTask, undefined, string>({
        id: "task-preview-priority",
        label: "Priority",
        get: (value) => value.priority ?? "medium",
        set: (value, priority) => ({
          ...value,
          priority: priority as ApplicationTaskPriority,
        }),
        renderers: {
          edit: {
            component: ApplicationTaskInlineOptionFormField,
            wrapper: "none",
            props: {
              options: priorityOptions,
              ariaLabel: "Task priority",
            },
          },
        },
      }),
      customField<ApplicationTask, undefined, string | null>({
        id: "task-preview-due-at",
        label: "Due At",
        get: (value) => value.dueAt ?? null,
        set: (value, dueAt) => ({
          ...value,
          dueAt: dueAt || undefined,
        }),
        renderers: {
          edit: {
            component: ApplicationTaskWhenFormField,
            wrapper: "none",
            props: ({ root }) => ({
              mode: "due",
              pickerId: `task-due-picker-${root.id}`,
              variant: "footer",
            }),
          },
        },
      }),
      customField<
        ApplicationTask,
        undefined,
        Pick<ApplicationTask, "scheduledAt" | "when" | "start" | "planDate" | "planAt">
      >({
        id: "task-preview-when",
        label: "When",
        get: (value) => ({
          scheduledAt: value.scheduledAt,
          when: value.when,
          start: value.start,
          planDate: value.planDate,
          planAt: value.planAt,
        }),
        set: (value, schedule) => ({
          ...value,
          scheduledAt: schedule.scheduledAt,
          when: schedule.when,
          start: schedule.start,
          planDate: schedule.planDate,
          planAt: schedule.planAt,
        }),
        renderers: {
          edit: {
            component: ApplicationTaskWhenFormField,
            wrapper: "none",
            props: ({ root }) => ({
              pickerId: `task-when-picker-${root.id}`,
            }),
          },
        },
      }),
      customField<
        ApplicationTask,
        undefined,
        Pick<ApplicationTask, "scheduledAt" | "when" | "start" | "planDate" | "planAt">
      >({
        id: "task-preview-at",
        label: "At",
        get: (value) => ({
          scheduledAt: value.scheduledAt,
          when: value.when,
          start: value.start,
          planDate: value.planDate,
          planAt: value.planAt,
        }),
        set: (value, schedule) => ({
          ...value,
          scheduledAt: schedule.scheduledAt,
          when: schedule.when,
          start: schedule.start,
          planDate: schedule.planDate,
          planAt: schedule.planAt,
        }),
        renderers: {
          edit: {
            component: ApplicationTaskAtFormField,
            wrapper: "none",
            props: ({ root }) => ({
              pickerId: `task-at-picker-${root.id}`,
            }),
          },
        },
      }),
      customField<ApplicationTask, undefined, string[]>({
        id: "task-preview-area",
        label: "Area",
        get: (value) => value.areas ?? [],
        set: (value, areas) => ({
          ...value,
          areas,
        }),
        renderers: {
          edit: {
            component: ApplicationTaskAreaFormField,
            wrapper: "none",
            props: () => ({
              options: areaOptions,
              ariaLabel: "Task area",
            }),
          },
        },
      }),
    ],
  });

  let titleDraft = $state("");
  let titleInput = $state<HTMLInputElement | null>(null);
  let titleEditing = $state(false);
  let titleEditor = $state<HTMLDivElement | null>(null);
  let notesEditing = $state(false);
  let notesDraft = $state("");
  let notesInput = $state<HTMLTextAreaElement | null>(null);
  let wasExpanded = false;

  $effect(() => {
    if (!isExpanded || readonly) {
      notesEditing = false;
      titleDraft = task.body;
      wasExpanded = false;
      return;
    }

    if (!wasExpanded) {
      titleDraft = task.body;
      notesDraft = task.notes ?? "";
      void tick().then(() => {
        titleInput?.focus();
        const end = titleInput?.value.length ?? 0;
        titleInput?.setSelectionRange(end, end);
      });
    }

    wasExpanded = true;
  });

  $effect(() => {
    if (!isOpenSurface && !readonly) return;
    titleEditing = false;
    titleEditor = null;
  });

  $effect(() => {
    if (!notesEditing) {
      notesDraft = task.notes ?? "";
    }
  });

  function placeTitleCaret(
    editor: HTMLDivElement,
    point: { x: number; y: number } | null,
  ) {
    const documentWithCaret = editor.ownerDocument as Document & {
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const selection = editor.ownerDocument.defaultView?.getSelection();
    if (!selection) return;

    let range: Range | null = null;
    if (point && documentWithCaret.caretPositionFromPoint) {
      const position = documentWithCaret.caretPositionFromPoint(
        point.x,
        point.y,
      );
      if (position && editor.contains(position.offsetNode)) {
        range = editor.ownerDocument.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    }
    if (!range && point && documentWithCaret.caretRangeFromPoint) {
      const candidate = documentWithCaret.caretRangeFromPoint(point.x, point.y);
      if (candidate && editor.contains(candidate.startContainer)) {
        range = candidate;
        range.collapse(true);
      }
    }
    if (!range) {
      range = editor.ownerDocument.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  function prefersSurfaceSelection(target: EventTarget | null) {
    if (selectOnSurfaceClick) return true;
    return (
      target instanceof Element &&
      Boolean(
        target.closest('[data-planner-select-on-surface="true"]'),
      )
    );
  }

  async function handleTitleClick(event: MouseEvent) {
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      event.preventDefault();
      return;
    }
    if (readonly || isOpenSurface) return;
    if (prefersSurfaceSelection(event.target)) {
      // Prefer row selection while a host detail panel is open.
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onTitleEditStart(task.id);
    titleDraft = task.body;
    titleEditing = true;
    const point =
      event.detail > 0 ? { x: event.clientX, y: event.clientY } : null;
    await tick();
    if (!titleEditor) return;
    titleEditor.textContent = titleDraft;
    titleEditor.focus();
    placeTitleCaret(titleEditor, point);
  }

  function handleTitleDoubleClick(event: MouseEvent) {
    if (readonly || isOpenSurface) return;
    event.preventDefault();
    event.stopPropagation();
    if (titleEditing) {
      titleDraft = titleEditor?.textContent ?? titleDraft;
      saveTitle();
      titleEditing = false;
      titleEditor = null;
    }
    onRequestOpen(task.id, "inline");
  }

  function saveTitle() {
    const nextTitle = titleDraft.trim();
    if (!nextTitle || nextTitle === task.body) {
      titleDraft = task.body;
      return;
    }
    onUpdateTask(task.id, { body: nextTitle });
  }

  function handleTitleBlur() {
    titleDraft = titleEditor?.textContent ?? titleDraft;
    saveTitle();
    titleEditing = false;
    titleEditor = null;
  }

  function handleTitleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (titleEditing) {
        titleEditor?.blur();
      } else {
        saveTitle();
        titleInput?.blur();
      }
    }
    if (event.key === "Escape") {
      event.preventDefault();
      titleDraft = task.body;
      if (titleEditing) {
        if (titleEditor) titleEditor.textContent = titleDraft;
        titleEditor?.blur();
      } else {
        titleInput?.blur();
      }
    }
  }

  function saveNotes() {
    notesEditing = false;
    const nextNotes = notesDraft.trim();
    const currentNotes = task.notes?.trim() ?? "";
    if (nextNotes === currentNotes) return;
    onUpdateTask(task.id, { notes: nextNotes || undefined });
  }

  function openNotesEditor() {
    notesEditing = true;
    notesDraft = task.notes ?? "";
    void tick().then(() => notesInput?.focus());
  }

  function statusLabel(status: ApplicationTask["status"]) {
    if (status === "canceled") return "Canceled";
    if (status === "completed" || status === "done") return "Completed";
    return "Open";
  }

  function priorityLabel(priority: ApplicationTaskPriority | undefined) {
    if (priority === "high") return "High";
    if (priority === "low") return "Low";
    return "Medium";
  }

  function updateFooterTask(nextTask: ApplicationTask) {
    onUpdateTask(task.id, {
      status: nextTask.status,
      done: nextTask.done,
      completedAt: nextTask.completedAt,
      priority: nextTask.priority,
      dueAt: nextTask.dueAt,
      scheduledAt: nextTask.scheduledAt,
      when: nextTask.when,
      start: nextTask.start,
      planDate: nextTask.planDate,
      planAt: nextTask.planAt,
      areas: nextTask.areas,
    });
  }
</script>

{#if embedded && readonly && isExpanded}
  <div class="task-preview-row-embedded-readonly">
    <div
      class="task-preview-row__expanded"
      data-task-preview-surface="true"
      role="group"
    >
      <div class="task-preview-row__notes">
        {#if task.notes?.trim()}
          <ApplicationMarkdownPreview value={task.notes} compact />
        {:else}
          <span class="task-preview-row__notes-empty">No notes</span>
        {/if}
      </div>

      <footer
        class="task-preview-row__footer task-preview-row__footer--readonly"
      >
        <div class="task-preview-row__footer-meta">
          <span class="task-preview-row__readonly-chip">
            {statusLabel(effectiveStatus)}
          </span>
          <span class="task-preview-row__readonly-chip">
            {priorityLabel(task.priority)} priority
          </span>
          {#if dueSummary}
            <span class="task-preview-row__readonly-chip">
              Due {dueSummary.shortDate}
              {#if dueSummary.distance}
                · {dueSummary.distance}
              {/if}
            </span>
          {/if}
          {#if task.areas?.[0]}
            <span class="task-preview-row__readonly-chip">
              {task.areas[0]}
              {#if task.areas.length > 1}
                +{task.areas.length - 1}
              {/if}
            </span>
          {/if}
          {#if task.done && task.completedAt}
            <span class="task-preview-row__completed">
              Completed {formatCompletedTimestamp(task.completedAt)}
            </span>
          {/if}
        </div>
      </footer>
    </div>
  </div>
{:else if ownSwipe}
  <SwipeItem.Root
    class="task-preview-row-swipe"
    bind:open={swipeOpen}
    disabled={!swipeEnabled}
  >
    {#if showSwipeActions}
      <SwipeItem.Actions
        side="end"
        aria-label="Task delete actions"
        onFullSwipe={removeTask}
      >
        <SwipeItem.Action
          variant="destructive"
          size="icon"
          class="task-preview-row__swipe-delete"
          aria-label={`Remove task ${titleExcerpt}`}
          title={`Remove task ${titleExcerpt}`}
          onclick={removeTask}
        >
          <Trash2Icon />
        </SwipeItem.Action>
      </SwipeItem.Actions>
    {/if}

    <SwipeItem.Content class="task-preview-row-swipe__content">
      {@render previewShell()}
    </SwipeItem.Content>
  </SwipeItem.Root>
{:else}
  {@render previewShell()}
{/if}

{#snippet previewShell()}
  <div
    class="task-preview-row-shell"
    class:task-preview-row-shell--dragging={dragging}
    class:task-preview-row-shell--expanded={isOpenSurface}
    class:task-preview-row-shell--embedded={embedded}
    data-sortable-item={embedded ? undefined : true}
    data-sortable-index={embedded ? undefined : taskIndex}
    data-sortable-group={embedded ? undefined : sortableGroup}
  >
    {#if showCollapsedChrome}
      <button
        type="button"
        class="task-preview-row__drag-handle"
        data-task-drag-handle
        data-swipe-item-gesture-ignore
        aria-label={`Reorder ${titleExcerpt}`}
        onpointerdown={(event) => onDragStart(event)}
      >
        <GripVerticalIcon />
      </button>

      <div
        class="task-preview-row__hover-actions"
        data-task-preview-hover-actions
        data-swipe-item-gesture-ignore
      >
        <div class="task-preview-row__hover-move">
          <button
            type="button"
            aria-label="Move task up"
            disabled={!canMoveUp}
            onclick={() => onMoveTask(task.id, -1)}
          >
            <ArrowUpIcon />
          </button>
          <button
            type="button"
            aria-label="Move task down"
            disabled={!canMoveDown}
            onclick={() => onMoveTask(task.id, 1)}
          >
            <ArrowDownIcon />
          </button>
        </div>
        {#if showHoverEnd}
          <div class="task-preview-row__hover-end">
            {#if showSwipeTrigger && !readonly}
              <SwipeItem.Trigger
                side="end"
                class="task-preview-row__hover-swipe-trigger"
                aria-label={`Show delete action for ${titleExcerpt}`}
                title="Show delete action"
              >
                <EllipsisVerticalIcon />
              </SwipeItem.Trigger>
            {/if}
            {#if showHoverOpen}
              <button
                type="button"
                class="task-preview-row__hover-open"
                aria-label={`Open task details for ${titleExcerpt}`}
                title="Open task details"
                onclick={openTaskDetails}
              >
                <ArrowRightIcon />
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <article
      class="task-preview-row"
      class:task-preview-row--expanded={isOpenSurface}
      class:task-preview-row--closing={isClosing}
      class:task-preview-row--done={task.done}
      data-task-preview-id={task.id}
      data-task-preview-state={isExpanded
        ? "expanded"
        : isClosing
          ? "closing"
          : "collapsed"}
    >
      {#if readonly}
        <ApplicationTaskLine
          {task}
          titleMode="text"
          ariaExpanded={isExpanded}
          onTitleClick={handleTitleClick}
          {onToggleDone}
        />
      {:else}
        <ApplicationTaskLine
          {task}
          showCheckbox
          {isOpenSurface}
          titleMode="inline-edit"
          {titleEditing}
          bind:titleDraft
          bind:titleInput
          bind:titleEditor
          ariaExpanded={isExpanded}
          onTitleBlur={handleTitleBlur}
          onTitleKeydown={handleTitleKeydown}
          onTitleClick={handleTitleClick}
          onTitleDoubleClick={handleTitleDoubleClick}
          {onToggleDone}
          expandedPanel={asSnippet(previewExpandedPanel)}
        />
      {/if}
    </article>
  </div>
{/snippet}

{#snippet previewExpandedPanel()}
  <div
    class="task-preview-row__expanded"
    class:task-preview-row__expanded--closing={isClosing}
    data-task-preview-surface="true"
    role="group"
    onpointerdown={(event) => event.stopPropagation()}
  >
    <div class="task-preview-row__notes">
      {#if notesEditing}
        <textarea
          bind:this={notesInput}
          bind:value={notesDraft}
          rows="1"
          class="task-preview-row__notes-input"
          placeholder="Notes"
          aria-label="Task notes"
          use:autosizeTextarea={notesDraft}
          onblur={saveNotes}
          onkeydown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              notesDraft = task.notes ?? "";
              notesEditing = false;
              notesInput?.blur();
            }
          }}></textarea>
      {:else if task.notes?.trim()}
        <button
          type="button"
          class="task-preview-row__notes-preview"
          onclick={openNotesEditor}
        >
          <ApplicationMarkdownPreview value={task.notes} compact />
        </button>
      {:else}
        <button
          type="button"
          class="task-preview-row__notes-placeholder"
          onclick={openNotesEditor}
        >
          Notes
        </button>
      {/if}
    </div>

    <footer class="task-preview-row__footer">
      <div class="task-preview-row__footer-meta">
        <StructuredForm
          value={task}
          config={footerFormConfig}
          onChange={(nextTask) => updateFooterTask(nextTask as ApplicationTask)}
        />
        {#if task.done && task.completedAt}
          <span class="task-preview-row__completed">
            Completed {formatCompletedTimestamp(task.completedAt)}
          </span>
        {/if}
      </div>

      {#if showFooterActions}
        <div class="task-preview-row__footer-actions">
          <button
            type="button"
            aria-label="Move task up"
            disabled={!canMoveUp}
            onclick={() => onMoveTask(task.id, -1)}
          >
            <ArrowUpIcon />
          </button>
          <button
            type="button"
            aria-label="Move task down"
            disabled={!canMoveDown}
            onclick={() => onMoveTask(task.id, 1)}
          >
            <ArrowDownIcon />
          </button>
          <button
            type="button"
            aria-label={`Remove task ${titleExcerpt}`}
            onclick={() => onRemoveTask(task.id)}
          >
            <Trash2Icon />
          </button>
        </div>
      {/if}
    </footer>
  </div>
{/snippet}
