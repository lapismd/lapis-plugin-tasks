<script lang="ts">
	import './ApplicationTaskPlannerShell.css';
  import * as Dialog from "@lapismd/design-core/shadcn/dialog";
  import type { Snippet } from "svelte";
  import TaskPlanner from "../../tasks/task-planner/TaskPlanner.svelte";
  import {
    todayDateOnly,
    type Task,
    type TaskBucket,
    type TaskPlannerQuickPlacement,
    type TaskPlannerRowContext,
    type TaskQuickCreateInput,
  } from "../../model";
  import {
    DEFAULT_TASKS_PLUGIN_SETTINGS,
    type TasksPluginSettings,
  } from "../../tasks-settings";

  import {
    TASK_PREVIEW_CLOSE_ANIMATION_MS,
    TASK_PREVIEW_EXPAND_ANIMATION_MS,
    TASK_PREVIEW_SHELL_TRANSITION_MS,
  } from '../../model';
  import ApplicationTaskWhenPickerContent from "../application-task-when-picker-content/ApplicationTaskWhenPickerContent.svelte";

  type ApplicationSummary = {
    title: string;
    subtitle?: string;
    color?: string;
  };

  type QuickPlacement = TaskPlannerQuickPlacement;

  let {
    rootElement = $bindable<HTMLElement | null>(null),
    tasks = [],
    now,
    clock = () => now ?? new Date(),
    settings = DEFAULT_TASKS_PLUGIN_SETTINGS,
    selectedDate = $bindable(todayDateOnly(now ?? clock())),
    actualToday = todayDateOnly(now ?? clock()),
    view = "today",
    area = null,
    taskRow,
    applicationSummaries = {},
    selectedTaskIds = [],
    draggedTaskIds = [],
    pointerDropTargetId = null,
    scheduleDropOpen = false,
    scheduleDropValue = null,
    scheduleDropWhen = null,
    scheduleDropPlanAt = null,
    dragPreviewTask = null,
    dragPreviewPointer = null,
    dragPreviewGeometry = null,
    dragPreviewRow = undefined,
    dragPreviewOverSidebar = false,
    dragPreviewDueLabel = null,
    onOpenApplication = () => {},
    onCreateTask = undefined,
    onCloseScheduleDrop = () => {},
    onClearScheduleDrop = () => {},
    onSelectScheduleDate = () => {},
    onSelectSchedulePlacement = () => {},
  }: {
    rootElement?: HTMLElement | null;
    tasks?: Task[];
    now?: Date;
    clock?: () => Date;
    settings?: TasksPluginSettings;
    selectedDate?: string;
    actualToday?: string;
    view?: TaskBucket;
    area?: string | null;
    taskRow?: Snippet<[Task, TaskPlannerRowContext]>;
    applicationSummaries?: Record<string, ApplicationSummary>;
    selectedTaskIds?: string[];
    draggedTaskIds?: string[];
    pointerDropTargetId?: string | null;
    scheduleDropOpen?: boolean;
    scheduleDropValue?: string | null;
    scheduleDropWhen?: string | null;
    scheduleDropPlanAt?: string | null;
    dragPreviewTask?: Task | null;
    dragPreviewPointer?: { x: number; y: number } | null;
    dragPreviewGeometry?: {
      width: number;
      height: number;
      offsetX: number;
      offsetY: number;
    } | null;
    dragPreviewRow?: Snippet<[Task]>;
    dragPreviewOverSidebar?: boolean;
    dragPreviewDueLabel?: string | null;
    onOpenApplication?: (applicationId: string) => void | Promise<void>;
    onCreateTask?: (input: TaskQuickCreateInput) => void | Promise<void>;
    onCloseScheduleDrop?: () => void | Promise<void>;
    onClearScheduleDrop?: () => void | Promise<void>;
    onSelectScheduleDate?: (date: string) => void | Promise<void>;
    onSelectSchedulePlacement?: (placement: QuickPlacement) => void | Promise<void>;
  } = $props();

  const taskPreviewStyle = `--task-preview-close-ms: ${TASK_PREVIEW_CLOSE_ANIMATION_MS}ms; --task-preview-expand-ms: ${TASK_PREVIEW_EXPAND_ANIMATION_MS}ms; --task-preview-shell-ms: ${TASK_PREVIEW_SHELL_TRANSITION_MS}ms`;
  const dragPreviewStyle = $derived(
    dragPreviewPointer
      ? [
          `--planner-drag-x: ${dragPreviewPointer.x}px`,
          `--planner-drag-y: ${dragPreviewPointer.y}px`,
          dragPreviewGeometry
            ? `--planner-drag-left: ${dragPreviewPointer.x - dragPreviewGeometry.offsetX}px`
            : "",
          dragPreviewGeometry
            ? `--planner-drag-top: ${dragPreviewPointer.y - dragPreviewGeometry.offsetY}px`
            : "",
          dragPreviewGeometry
            ? `--planner-drag-width: ${dragPreviewGeometry.width}px`
            : "",
          dragPreviewGeometry
            ? `--planner-drag-height: ${dragPreviewGeometry.height}px`
            : "",
        ]
          .filter(Boolean)
          .join("; ")
      : "",
  );
</script>

<div bind:this={rootElement} class="application-task-view" style={taskPreviewStyle}>
  <TaskPlanner
    {tasks}
    {now}
    {clock}
    {settings}
    bind:selectedDate
    {actualToday}
    {view}
    {area}
    {taskRow}
    {applicationSummaries}
    {selectedTaskIds}
    draggedTaskIds={draggedTaskIds}
    {pointerDropTargetId}
    {onOpenApplication}
    {onCreateTask}
  />
  <Dialog.Root
    open={scheduleDropOpen}
    onOpenChange={(open) => {
      if (!open && scheduleDropOpen) void onCloseScheduleDrop();
    }}
  >
    <Dialog.Content
      class="planner-schedule-drop__panel"
      aria-label="Schedule dropped tasks"
      showCloseButton={false}
    >
      <header class="planner-schedule-drop__header">
        <h2>Schedule</h2>
        <Dialog.Close>
          {#snippet child({ props })}
            <button {...props} type="button" aria-label="Close schedule picker">
              X
            </button>
          {/snippet}
        </Dialog.Close>
      </header>
      <ApplicationTaskWhenPickerContent
        clearable
        scheduledAt={scheduleDropValue}
        when={scheduleDropWhen}
        planAt={scheduleDropPlanAt}
        onClear={onClearScheduleDrop}
        onSelectDate={onSelectScheduleDate}
        onSelectPlacement={onSelectSchedulePlacement}
      />
    </Dialog.Content>
  </Dialog.Root>
  {#if dragPreviewTask &&
  dragPreviewPointer &&
  (dragPreviewOverSidebar || draggedTaskIds.length > 1)}
    <div
      aria-hidden="true"
      inert
      class="planner-drag-preview"
      class:planner-drag-preview--row={!dragPreviewOverSidebar && draggedTaskIds.length === 1}
      class:planner-drag-preview--stack={!dragPreviewOverSidebar && draggedTaskIds.length > 1}
      class:planner-drag-preview--sidebar={dragPreviewOverSidebar}
      style={dragPreviewStyle}
    >
      {#if dragPreviewOverSidebar}
        <span class="planner-drag-preview__skeleton"></span>
        <span class="planner-drag-preview__count">
          {draggedTaskIds.length}
        </span>
      {:else if dragPreviewRow}
        {@render dragPreviewRow(dragPreviewTask)}
        {#if draggedTaskIds.length > 1}
          <span class="planner-drag-preview__count">
            {draggedTaskIds.length}
          </span>
        {/if}
      {:else}
        <span class="planner-drag-preview__title">
          {dragPreviewTask.title}
        </span>
        {#if dragPreviewDueLabel}
          <span class="planner-drag-preview__meta">
            {dragPreviewDueLabel}
          </span>
        {/if}
        {#if draggedTaskIds.length > 1}
          <span class="planner-drag-preview__count">
            {draggedTaskIds.length}
          </span>
        {/if}
      {/if}
    </div>
  {/if}
</div>
