<script lang="ts">
	import './ApplicationPlannerTaskRow.css';
  import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
  import BriefcaseBusinessIcon from "@lucide/svelte/icons/briefcase-business";
  import TextIcon from "@lucide/svelte/icons/text";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import * as SwipeItem from "@lapismd/design-core/shadcn/swipe-item";
  import type { SwipeItemOpen } from "@lapismd/design-core/shadcn/swipe-item";
  import {
    taskToApplicationTask,
    type ChecklistItem,
    type PlannerSelectionPosition,
    type Task,
  } from "../../model";

  import type { ApplicationTask } from '../../model';
  import ApplicationTaskAreaPicker from "../application-task-area-picker/ApplicationTaskAreaPicker.svelte";
  import ApplicationTaskChecklistProgress from "../application-task-checklist-progress/ApplicationTaskChecklistProgress.svelte";
  import ApplicationTaskPreviewRow from "../application-task-preview-row/ApplicationTaskPreviewRow.svelte";

  type ApplicationSummary = {
    title: string;
    subtitle?: string;
    color?: string;
  };

  let {
    task,
    application = null,
    taskIndex = 0,
    taskTotal = 1,
    sortableGroup = "planner",
    dragging = false,
    selected = false,
    selectionPosition = null,
    expanded = false,
    closing = false,
    dragPreview = false,
    /**
     * When true, plain clicks on the preview surface/title select the row
     * instead of starting title edit (used while a host detail panel is open).
     */
    selectOnSurfaceClick = false,
    areaOptions = [],
    onRequestOpen = () => {},
    onStartTitleEdit = () => {},
    onSelectTask = () => {},
    onDragStart = () => {},
    onToggleDone = () => {},
    onUpdateTask = () => {},
    onRemoveTask = () => {},
    onLoadChecklist,
    onToggleChecklistItem,
    checklistRefreshVersion = 0,
    onMoveTask = () => {},
    onOpenApplication = () => {},
  }: {
    task: Task;
    application?: ApplicationSummary | null;
    taskIndex?: number;
    taskTotal?: number;
    sortableGroup?: string;
    dragging?: boolean;
    selected?: boolean;
    selectionPosition?: PlannerSelectionPosition | null;
    expanded?: boolean;
    closing?: boolean;
    dragPreview?: boolean;
    selectOnSurfaceClick?: boolean;
    areaOptions?: string[];
    onRequestOpen?: (
      taskId: string,
      source?: "details-button" | "inline",
    ) => void;
    onStartTitleEdit?: (task: Task) => void;
    onSelectTask?: (task: Task, event: MouseEvent) => void;
    onDragStart?: (event: PointerEvent) => void;
    onToggleDone?: (task: Task, event: Event) => void;
    onUpdateTask?: (task: Task, patch: Partial<ApplicationTask>) => void;
    onRemoveTask?: (task: Task) => void;
    onLoadChecklist?: (task: Task) => Promise<ChecklistItem[]>;
    onToggleChecklistItem?: (
      task: Task,
      item: ChecklistItem,
      checked: boolean,
    ) => Promise<ChecklistItem[]>;
    checklistRefreshVersion?: number;
    onMoveTask?: (task: Task, direction: -1 | 1) => void;
    onOpenApplication?: (applicationId: string) => void;
  } = $props();

  const applicationTask = $derived(taskToApplicationTask(task));
  const taskKey = $derived(`${task.applicationId ?? "task"}:${task.id}`);
  const openSurface = $derived(expanded || closing);
  const showSelectedSurface = $derived(selected && !openSurface);
  const showMeta = $derived(
    Boolean((application && task.applicationId) || task.areas.length || task.listId),
  );
  const showRowSwipe = $derived(!openSurface && !dragPreview);
  const swipeEnabled = $derived(showRowSwipe && !dragging);
  let swipeOpen = $state<SwipeItemOpen>(null);

  function shouldIgnoreRowPointer(
    target: EventTarget | null,
    event?: Pick<MouseEvent, "shiftKey" | "metaKey" | "ctrlKey">,
  ) {
    if (
      target instanceof Element &&
      target.closest(
        "[contenteditable='true'], [contenteditable='plaintext-only']",
      )
    ) {
      return true;
    }
    if (target instanceof Element && target.closest(".task-line__title")) {
      // Host detail open: plain title clicks select. Otherwise title owns edit;
      // modifier clicks still bubble for selection.
      if (selectOnSurfaceClick) return false;
      return !(event?.shiftKey || event?.metaKey || event?.ctrlKey);
    }
    const ignoreSelectors = [
      "button",
      "a",
      "input",
      "textarea",
      "select",
      "[contenteditable='true']",
      "[data-task-due-picker]",
      "[data-task-when-picker]",
      "[data-task-at-picker]",
      "[data-task-area-picker]",
      "[data-task-checklist-progress]",
      "[popover]",
      "[role='dialog']",
    ];
    if (!selectOnSurfaceClick) {
      ignoreSelectors.push("[data-task-preview-surface]");
    }
    return (
      target instanceof Element &&
      Boolean(target.closest(ignoreSelectors.join(",")))
    );
  }

  function handleRowClick(event: MouseEvent) {
    if (shouldIgnoreRowPointer(event.target, event)) return;
    onSelectTask(task, event);
  }

  function handleRowPointerDown(event: PointerEvent) {
    if (shouldIgnoreRowPointer(event.target, event)) return;
    // Swipe owns pointer gestures on the primary column; reorder uses the grip.
    if (
      showRowSwipe &&
      event.target instanceof Element &&
      event.target.closest(
        ".application-planner-task-row__swipe[data-ui-part='root']",
      )
    ) {
      return;
    }
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      event.preventDefault();
    }
    onDragStart(event);
  }

  function handleRowDoubleClick(event: MouseEvent) {
    if (shouldIgnoreRowPointer(event.target, event)) return;
    event.preventDefault();
    onRequestOpen(task.id, "inline");
  }

  function handleRowKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (shouldIgnoreRowPointer(event.target, event)) return;
    event.preventDefault();
    onSelectTask(task, event as unknown as MouseEvent);
  }

  function updateTaskAreas(areas: string[]) {
    onUpdateTask(task, { areas, listId: areas[0] });
  }

  function removeTask() {
    onRemoveTask(task);
  }

  function openTaskDetails(event: MouseEvent) {
    event.stopPropagation();
    onRequestOpen(task.id, "details-button");
  }
</script>

<div
  class="application-planner-task-row"
  class:application-planner-task-row--dragged={dragging}
  class:application-planner-task-row--expanded={openSurface}
  class:application-planner-task-row--selected={showSelectedSurface}
  class:application-planner-task-row--selected-first={showSelectedSurface &&
    selectionPosition === "first"}
  class:application-planner-task-row--selected-last={showSelectedSurface &&
    selectionPosition === "last"}
  class:application-planner-task-row--selected-middle={showSelectedSurface &&
    selectionPosition === "middle"}
  class:application-planner-task-row--selected-single={showSelectedSurface &&
    selectionPosition === "single"}
  class:application-planner-task-row--drag-preview={dragPreview}
  data-planner-task-id={dragPreview ? undefined : task.id}
  data-planner-task-key={dragPreview ? undefined : taskKey}
  data-planner-select-on-surface={dragPreview
    ? undefined
    : selectOnSurfaceClick
      ? "true"
      : undefined}
  data-planner-selected={dragPreview
    ? undefined
    : selected
      ? "true"
      : undefined}
  data-planner-selection-position={dragPreview
    ? undefined
    : selectionPosition ?? undefined}
  style={application?.color
    ? `--card-color: ${application.color}; --task-application-color: ${application.color};`
    : ""}
  onclick={dragPreview ? undefined : handleRowClick}
  ondblclick={dragPreview ? undefined : handleRowDoubleClick}
  onkeydown={dragPreview ? undefined : handleRowKeydown}
  onpointerdown={dragPreview ? undefined : handleRowPointerDown}
  role="button"
  tabindex={0}
>
  <div class="application-planner-task-row__columns">
    {#if showRowSwipe}
      <SwipeItem.Root
        class="application-planner-task-row__swipe application-planner-task-row__primary"
        bind:open={swipeOpen}
        disabled={!swipeEnabled}
      >
        <SwipeItem.Actions
          side="end"
          aria-label="Task delete actions"
          onFullSwipe={removeTask}
        >
          <SwipeItem.Action
            variant="destructive"
            size="icon"
            class="application-planner-task-row__swipe-delete"
            aria-label={`Remove task ${task.title}`}
            title={`Remove task ${task.title}`}
            onclick={removeTask}
          >
            <Trash2Icon />
          </SwipeItem.Action>
        </SwipeItem.Actions>

        <SwipeItem.Content class="application-planner-task-row__swipe-content">
          {@render primaryColumn()}
        </SwipeItem.Content>
      </SwipeItem.Root>

      <div class="application-planner-task-row__aside">
        <button
          type="button"
          class="application-planner-task-row__open"
          aria-label={`Open task details for ${task.title}`}
          title="Open task details"
          onclick={openTaskDetails}
        >
          <span
            class="application-planner-task-row__open-icon application-planner-task-row__open-icon--notes"
            aria-hidden="true"
          >
            <TextIcon />
          </span>
          <span
            class="application-planner-task-row__open-icon application-planner-task-row__open-icon--arrow"
            aria-hidden="true"
          >
            <ArrowRightIcon />
          </span>
        </button>
      </div>
    {:else}
      <div class="application-planner-task-row__primary">
        {@render primaryColumn()}
      </div>
    {/if}
  </div>
  <ApplicationTaskChecklistProgress
    task={applicationTask}
    layout="planner"
    selected={showSelectedSurface}
    onLoadChecklist={onLoadChecklist ? () => onLoadChecklist(task) : undefined}
    onToggleChecklistItem={onToggleChecklistItem
      ? (item, checked) => onToggleChecklistItem(task, item, checked)
      : undefined}
    {checklistRefreshVersion}
  />
</div>

{#snippet primaryColumn()}
  <div class="application-planner-task-row__task">
    <ApplicationTaskPreviewRow
      task={applicationTask}
      {taskIndex}
      {taskTotal}
      {sortableGroup}
      {dragging}
      isExpanded={expanded}
      isClosing={closing}
      {areaOptions}
      ownSwipe={false}
      showHoverOpen={false}
      showSwipeTrigger={showRowSwipe}
      {selectOnSurfaceClick}
      {onDragStart}
      onTitleEditStart={() => onStartTitleEdit(task)}
      onRequestOpen={(_taskId, source) => onRequestOpen(task.id, source)}
      onToggleDone={(_, event) => onToggleDone(task, event)}
      onUpdateTask={(_, patch) => onUpdateTask(task, patch)}
      onRemoveTask={() => onRemoveTask(task)}
      showChecklistProgress={false}
      onMoveTask={(_, direction) => onMoveTask(task, direction)}
    />
  </div>
  {#if showMeta}
    <div
      class="application-planner-task-row__meta"
      data-swipe-item-gesture-ignore
    >
      {#if application && task.applicationId}
        <button
          type="button"
          class="application-planner-task-row__application"
          onclick={() => onOpenApplication(task.applicationId ?? "")}
        >
          <BriefcaseBusinessIcon />
          <span>
            <strong>{application.title}</strong>
            {#if application.subtitle}
              <small>{application.subtitle}</small>
            {/if}
          </span>
        </button>
      {/if}
      {#if task.areas.length || task.listId}
        <ApplicationTaskAreaPicker
          variant="chip"
          areas={task.areas}
          listId={task.listId ?? task.areas[0]}
          options={areaOptions}
          onChange={updateTaskAreas}
        />
      {/if}
    </div>
  {/if}
{/snippet}
