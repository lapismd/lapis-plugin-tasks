<script lang="ts">
	import './TaskPlanner.css';
  import {
    DragDropProvider,
    KeyboardSensor,
    PointerSensor,
  } from "@dnd-kit/svelte";
  import * as ScrollArea from "@lapismd/design-core/shadcn/scroll-area";
  import ArchiveIcon from "@lucide/svelte/icons/archive";
  import BriefcaseBusinessIcon from "@lucide/svelte/icons/briefcase-business";
  import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import CircleEllipsisIcon from "@lucide/svelte/icons/circle-ellipsis";
  import FlagIcon from "@lucide/svelte/icons/flag";
  import FolderKanbanIcon from "@lucide/svelte/icons/folder-kanban";
  import ListTodoIcon from "@lucide/svelte/icons/list-todo";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import { tick, type Snippet } from "svelte";

  import {
    buildTaskPlannerSnapshot,
    comparePlannerTasks,
    getPlannerSelectionPosition,
    listIdentitySlug,
    listsMatch,
    taskDateOnly,
    type TaskPlannerDateGroup,
    type TaskPlannerRowContext,
    type TaskPlannerUpcomingRow,
  } from '../../model';
  import type {
    Task,
    TaskBucket,
    TaskPriority,
    TaskQuickCreateInput,
    TaskWhen,
  } from '../../model';
  import { usePlannerDragController } from "../lib/planner-drag-context";
  import PlannerSortableList from "./PlannerSortableList.svelte";
  import PlannerSortableRow from "./PlannerSortableRow.svelte";
  import TaskQuickCreateActions from "./TaskQuickCreateActions.svelte";

  type ApplicationSummary = {
    title: string;
    subtitle?: string;
    color?: string;
  };

  type PlannerView = TaskBucket;

  let {
    tasks = [],
    now,
    view = "today",
    area = null,
    taskRow,
    applicationSummaries = {},
    onOpenApplication = () => {},
    selectedTaskIds = [],
    draggedTaskIds = [],
    pointerDropTargetId = null,
    onCreateTask = undefined,
  }: {
    tasks?: Task[];
    now?: Date;
    view?: PlannerView;
    area?: string | null;
    taskRow?: Snippet<[Task, TaskPlannerRowContext]>;
    applicationSummaries?: Record<string, ApplicationSummary>;
    onOpenApplication?: (applicationId: string) => void | Promise<void>;
    selectedTaskIds?: string[];
    draggedTaskIds?: string[];
    pointerDropTargetId?: string | null;
    onCreateTask?: (input: TaskQuickCreateInput) => void | Promise<void>;
  } = $props();

  let quickCreateTitles = $state<Record<string, string>>({});
  let quickCreateDueDates = $state<Record<string, string | undefined>>({});
  let quickCreatePriorities = $state<
    Record<string, TaskPriority | undefined>
  >({});
  let quickCreateSchedules = $state<
    Record<string, { scheduledAt?: string; when?: TaskWhen }>
  >({});
  let quickCreateActiveGroup = $state<string | null>(null);
  let quickCreateInteractionGroup = $state<string | null>(null);
  let plannerElement = $state<HTMLElement | null>(null);
  const dragController = usePlannerDragController();
  const plannerSensors = [
    PointerSensor.configure({
      activatorElements(source) {
        return [
          source.element?.querySelector<HTMLElement>("[data-task-drag-handle]") ??
            undefined,
        ];
      },
    }),
    KeyboardSensor,
  ];
  const snapshot = $derived(buildTaskPlannerSnapshot(tasks, now));
  const selectedTaskIdSet = $derived(new Set(selectedTaskIds));
  const draggedTaskIdSet = $derived(new Set(draggedTaskIds));
  const selectedArea = $derived.by(() => {
    if (!area) return null;
    const found = snapshot.areas.find((item) => listsMatch(item, area));
    if (found) return found;
    const title = areaTitleFromId(area);
    return { id: area, title, count: 0 };
  });
  const areaTasks = $derived.by(() => {
    if (!selectedArea) return [];
    return tasks
      .filter((task) => !isTaskDone(task))
      .filter(
        (task) =>
          Boolean(task.listId && listsMatch({ id: task.listId, title: task.listId }, selectedArea.id)) ||
          task.areas.some((taskArea) => listsMatch(selectedArea, taskArea)),
      )
      .sort(comparePlannerTasks);
  });
  const heading = $derived(
    selectedArea
      ? selectedArea.title
      : view === "today"
        ? "Today"
        : view === "upcoming"
          ? "Upcoming"
          : view === "anytime"
            ? "Anytime"
            : view === "someday"
              ? "Someday"
              : "Logbook",
  );
  const headingCount = $derived.by(() => {
    if (selectedArea) return areaTasks.length;
    if (view === "today")
      return snapshot.today.length + snapshot.thisEvening.length;
    if (view === "upcoming")
      return snapshot.upcoming.reduce(
        (total, group) => total + group.tasks.length,
        0,
      );
    if (view === "anytime") return snapshot.anytime.length;
    if (view === "someday") return snapshot.someday.length;
    return snapshot.logbook.reduce(
      (total, group) => total + group.tasks.length,
      0,
    );
  });
  const emptyLabel = $derived(
    selectedArea
      ? "No open tasks in this area"
      : view === "logbook"
        ? "No completed tasks"
        : `No ${heading.toLowerCase()} tasks`,
  );
  const quickCreateEnabled = $derived(Boolean(onCreateTask) && view !== "logbook");

  function areaTitleFromId(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "Area";
    if (/\s/.test(trimmed)) return trimmed;
    const slug = listIdentitySlug(trimmed);
    if (!slug) return "Area";
    return slug
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function isTaskDone(task: Task) {
    return task.status === "done" || Boolean(task.completedAt);
  }

  function taskDateLabel(task: Task) {
    const date = taskDateOnly(task.scheduledAt) ?? taskDateOnly(task.dueAt);
    if (!date) return "";
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  }

  function completedLabel(task: Task) {
    const date = taskDateOnly(task.completedAt) ?? taskDateOnly(task.updatedAt);
    if (!date) return "";
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  }

  function applicationSummary(task: Task) {
    return task.applicationId ? applicationSummaries[task.applicationId] : null;
  }

  function openApplication(task: Task) {
    if (task.applicationId) void onOpenApplication(task.applicationId);
  }

  function bucketForGroup(group: string): TaskBucket {
    if (group === "this-evening") return "today";
    if (group.startsWith("upcoming:")) return "upcoming";
    if (group === "today" || group === "anytime" || group === "someday" || group === "logbook") {
      return group;
    }
    return view;
  }

  function dateForGroup(group: string) {
    return group.startsWith("upcoming:") ? group.slice("upcoming:".length) : undefined;
  }

  function taskRowContext(
    items: Task[],
    task: Task,
    index: number,
    group: string,
  ): TaskPlannerRowContext {
    return {
      index,
      total: items.length,
      group,
      tasks: items,
      selected: selectedTaskIdSet.has(task.id),
      selectionPosition: getPlannerSelectionPosition(
        items,
        selectedTaskIdSet,
        task.id,
        index,
      ),
      dragged: draggedTaskIdSet.has(task.id),
    };
  }

  function quickCreateTitleFor(group: string) {
    return quickCreateTitles[group] ?? "";
  }

  function setQuickCreateTitle(group: string, value: string) {
    quickCreateTitles = { ...quickCreateTitles, [group]: value };
  }

  function quickCreateDueDateFor(group: string) {
    return quickCreateDueDates[group];
  }

  function setQuickCreateDueDate(group: string, value: string | undefined) {
    quickCreateDueDates = { ...quickCreateDueDates, [group]: value };
  }

  function quickCreatePriorityFor(group: string) {
    return quickCreatePriorities[group];
  }

  function setQuickCreatePriority(
    group: string,
    value: TaskPriority | undefined,
  ) {
    quickCreatePriorities = { ...quickCreatePriorities, [group]: value };
  }

  function defaultQuickCreateSchedule(group: string): {
    scheduledAt?: string;
    when?: TaskWhen;
  } {
    const date = dateForGroup(group);
    if (date) return { scheduledAt: date };
    if (group === "this-evening") return { when: "this-evening" };
    const bucket = bucketForGroup(group);
    if (bucket === "today") return { when: "today" };
    if (bucket === "anytime") return { when: "anytime" };
    if (bucket === "someday") return { when: "someday" };
    return {};
  }

  function quickCreateScheduleFor(group: string) {
    if (Object.prototype.hasOwnProperty.call(quickCreateSchedules, group)) {
      return quickCreateSchedules[group] ?? {};
    }
    return defaultQuickCreateSchedule(group);
  }

  function setQuickCreateSchedule(
    group: string,
    value: { scheduledAt?: string; when?: TaskWhen },
  ) {
    quickCreateSchedules = { ...quickCreateSchedules, [group]: value };
  }

  function quickCreateNeedsSchedule(group: string) {
    if (selectedArea || bucketForGroup(group) !== "upcoming") return false;
    const schedule = quickCreateScheduleFor(group);
    return !schedule.scheduledAt && !schedule.when;
  }

  function quickCreateTasksForGroup(group: string) {
    if (selectedArea) return areaTasks;
    if (group === "today") return snapshot.today;
    if (group === "this-evening") return snapshot.thisEvening;
    if (group === "anytime") return snapshot.anytime;
    if (group === "someday") return snapshot.someday;
    if (group.startsWith("upcoming:")) {
      const date = dateForGroup(group);
      return snapshot.upcoming.find((item) => item.date === date)?.tasks ?? [];
    }
    return [];
  }

  function quickCreateOrderForGroup(group: string) {
    const firstTask = quickCreateTasksForGroup(group)[0];
    const firstOrder =
      firstTask?.order ?? firstTask?.todayOrder ?? firstTask?.areaOrder;
    return Number.isFinite(firstOrder) ? (firstOrder as number) - 1024 : 0;
  }

  function quickCreateInputForGroup(group: string) {
    const schedule = quickCreateScheduleFor(group);
    const input: Omit<TaskQuickCreateInput, "title"> = {
      view: bucketForGroup(group),
      area: selectedArea?.id ?? selectedArea?.title ?? area,
      order: quickCreateOrderForGroup(group),
      dueAt: quickCreateDueDateFor(group),
      priority: quickCreatePriorityFor(group),
      scheduledAt: schedule.scheduledAt,
      when: schedule.when,
    };
    return input;
  }

  function clearQuickCreateDraft(group: string) {
    const nextTitles = { ...quickCreateTitles };
    const nextDueDates = { ...quickCreateDueDates };
    const nextPriorities = { ...quickCreatePriorities };
    const nextSchedules = { ...quickCreateSchedules };
    delete nextTitles[group];
    delete nextDueDates[group];
    delete nextPriorities[group];
    delete nextSchedules[group];
    quickCreateTitles = nextTitles;
    quickCreateDueDates = nextDueDates;
    quickCreatePriorities = nextPriorities;
    quickCreateSchedules = nextSchedules;
  }

  async function submitQuickCreate(group: string) {
    if (!onCreateTask) return;
    const title = quickCreateTitleFor(group).trim();
    if (!title) return;
    if (quickCreateNeedsSchedule(group)) return;
    await onCreateTask({
      title,
      ...quickCreateInputForGroup(group),
    });
    clearQuickCreateDraft(group);
    quickCreateActiveGroup = null;
    quickCreateInteractionGroup = null;
  }

  function quickCreateInputElement(group: string) {
    return Array.from(
      plannerElement?.querySelectorAll<HTMLInputElement>(
        "[data-task-quick-create]",
      ) ?? [],
    ).find((input) => input.dataset.taskQuickCreate === group);
  }

  async function activateQuickCreate(group: string) {
    quickCreateActiveGroup = group;
    await tick();
    quickCreateInputElement(group)?.focus();
  }

  function handleQuickCreateFocusOut(event: FocusEvent, group: string) {
    const editor = event.currentTarget as HTMLElement;
    const nextTarget =
      event.relatedTarget instanceof Element ? event.relatedTarget : null;
    if (
      nextTarget &&
      (editor.contains(nextTarget) ||
        nextTarget.closest(".task-quick-create-actions__panel"))
    ) {
      return;
    }
    queueMicrotask(() => {
      if (quickCreateActiveGroup !== group) return;
      if (quickCreateInteractionGroup === group) return;
      if (editor.contains(document.activeElement)) return;
      quickCreateActiveGroup = null;
    });
  }

  function handleQuickCreateInteraction(group: string, open: boolean) {
    if (open) {
      quickCreateInteractionGroup = group;
    } else if (quickCreateInteractionGroup === group) {
      quickCreateInteractionGroup = null;
    }
  }

  function handleQuickCreateShortcut(event: KeyboardEvent) {
    if (
      !quickCreateEnabled ||
      event.key.toLowerCase() !== "n" ||
      (!event.metaKey && !event.ctrlKey) ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }
    const activeInput = quickCreateActiveGroup
      ? quickCreateInputElement(quickCreateActiveGroup)
      : undefined;
    const trigger = plannerElement?.querySelector<HTMLElement>(
      "[data-task-quick-create-trigger]",
    );
    const group =
      activeInput?.dataset.taskQuickCreate ??
      trigger?.dataset.taskQuickCreateTrigger;
    if (!group) return;
    event.preventDefault();
    if (activeInput) activeInput.focus();
    else void activateQuickCreate(group);
  }
</script>

<svelte:window onkeydown={handleQuickCreateShortcut} />

{#snippet defaultTaskRow(task: Task)}
  {@const application = applicationSummary(task)}
  <article
    class="tasks-planner__task"
    class:tasks-planner__task--done={isTaskDone(task)}
  >
    <span class="tasks-planner__check" aria-hidden="true"></span>
    <div class="tasks-planner__task-main">
      <div class="tasks-planner__task-title-row">
        <h3>{task.title}</h3>
        {#if task.priority}
          <span class="tasks-planner__priority">
            <FlagIcon />
            {task.priority}
          </span>
        {/if}
      </div>
      <div class="tasks-planner__task-meta">
        {#if taskDateLabel(task)}
          <span>
            <CalendarClockIcon />
            {taskDateLabel(task)}
          </span>
        {/if}
        {#if isTaskDone(task) && completedLabel(task)}
          <span>
            <ArchiveIcon />
            {completedLabel(task)}
          </span>
        {/if}
        {#if task.status === "waiting"}
          <span>Waiting</span>
        {/if}
        {#each task.tags as tag (tag)}
          <span>#{tag}</span>
        {/each}
      </div>
      {#if task.notes.trim()}
        <p>{task.notes.trim()}</p>
      {/if}
    </div>
    {#if application && task.applicationId}
      <button
        type="button"
        class="tasks-planner__application"
        style={application.color
          ? `--task-application-color: ${application.color};`
          : ""}
        onclick={() => openApplication(task)}
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
  </article>
{/snippet}

{#snippet quickCreateRow(group: string)}
  {#if quickCreateEnabled}
    {#if quickCreateActiveGroup === group}
      <form
        class="task-preview-add-shell task-preview-add-shell--editing tasks-planner__inline-add"
        data-task-quick-create-editor={group}
        onsubmit={(event) => event.preventDefault()}
        onfocusout={(event) => handleQuickCreateFocusOut(event, group)}
      >
        <div class="task-preview-add task-preview-add--editing">
          <span class="task-preview-add__box" aria-hidden="true">
            <PlusIcon />
          </span>
          <div class="task-preview-add__editor">
            <input
              data-task-quick-create={group}
              value={quickCreateTitleFor(group)}
              placeholder="New task"
              aria-label="New task"
              aria-keyshortcuts="Meta+N Control+N"
              oninput={(event) =>
                setQuickCreateTitle(group, event.currentTarget.value)}
              onkeydown={(event) => {
                if (event.key !== "Enter" || event.isComposing) return;
                event.preventDefault();
                void submitQuickCreate(group);
              }}
            />
            <TaskQuickCreateActions
              dueAt={quickCreateDueDateFor(group)}
              priority={quickCreatePriorityFor(group)}
              scheduledAt={quickCreateScheduleFor(group).scheduledAt}
              when={quickCreateScheduleFor(group).when}
              onDueAtChange={(dueAt) => setQuickCreateDueDate(group, dueAt)}
              onPriorityChange={(priority) =>
                setQuickCreatePriority(group, priority)}
              onScheduleChange={(schedule) =>
                setQuickCreateSchedule(group, schedule)}
              onInteractionChange={(open) =>
                handleQuickCreateInteraction(group, open)}
            />
          </div>
        </div>
      </form>
    {:else}
      <div
        class="task-preview-add-shell tasks-planner__inline-add"
        data-task-quick-create-collapsed={group}
      >
        <div
          class="task-preview-add task-preview-add--collapsed"
          data-task-quick-create-trigger={group}
          role="button"
          tabindex="0"
          aria-label="New task"
          aria-keyshortcuts="Meta+N Control+N"
          onclick={() => void activateQuickCreate(group)}
          onkeydown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            void activateQuickCreate(group);
          }}
        >
          <span class="task-preview-add__box" aria-hidden="true">
            <PlusIcon />
          </span>
          <span
            class="task-preview-add__label"
            class:task-preview-add__label--draft={Boolean(
              quickCreateTitleFor(group),
            )}
          >
            {quickCreateTitleFor(group) || "New task"}
          </span>
          {#if !quickCreateTitleFor(group)}
            <kbd class="task-preview-add__shortcut" aria-hidden="true">⌘N</kbd>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
{/snippet}

{#snippet taskList(items: Task[], listLabel: string, group = listLabel)}
  {#if items.length}
    <PlannerSortableList id={group} label={listLabel}>
      {@render quickCreateRow(group)}
      {#each items as task, index (task.id)}
        <PlannerSortableRow
          id={task.id}
          {index}
          {group}
          dragged={draggedTaskIdSet.has(task.id)}
        >
          {#if taskRow}
            {@render taskRow(task, taskRowContext(items, task, index, group))}
          {:else}
            {@render defaultTaskRow(task)}
          {/if}
        </PlannerSortableRow>
      {/each}
    </PlannerSortableList>
  {:else if quickCreateEnabled}
    <PlannerSortableList id={group} label={listLabel}>
      {@render quickCreateRow(group)}
    </PlannerSortableList>
  {:else}
    <div class="tasks-planner__empty">{emptyLabel}</div>
  {/if}
{/snippet}

{#snippet dateGroup(group: TaskPlannerDateGroup)}
  <section class="tasks-planner__section">
    <header class="tasks-planner__section-header">
      <h2>{group.label}</h2>
      <span>{group.tasks.length}</span>
    </header>
    {@render taskList(group.tasks, group.label, `logbook:${group.date}`)}
  </section>
{/snippet}

{#snippet todaySection(title: string, items: Task[], listLabel: string, group: string)}
  {#if items.length || quickCreateEnabled}
    <section class="tasks-planner__section">
      <header class="tasks-planner__section-header">
        <h2>{title}</h2>
        <span>{items.length}</span>
      </header>
      {@render taskList(items, listLabel, group)}
    </section>
  {/if}
{/snippet}

{#snippet upcomingRows(rows: TaskPlannerUpcomingRow[])}
  <div class="tasks-planner__upcoming">
    {#each rows as row (row.kind === "day" ? row.date : row.id)}
      {#if row.kind === "month"}
        <div class="tasks-planner__upcoming-month">{row.label}</div>
      {:else if row.kind === "gap"}
        <div class="tasks-planner__gap" aria-label={row.label}></div>
      {:else}
        <section class="tasks-planner__upcoming-day">
          <div class="tasks-planner__date">
            <strong>{row.dayNumber}</strong>
            <span>{row.weekday}</span>
          </div>
          <div class="tasks-planner__upcoming-content">
            {#if row.tasks.length}
              {@render taskList(row.tasks, row.date, `upcoming:${row.date}`)}
            {:else}
              <PlannerSortableList id={`upcoming:${row.date}`} label={row.date}>
                <div class="tasks-planner__day-empty" aria-hidden="true"></div>
              </PlannerSortableList>
            {/if}
          </div>
        </section>
      {/if}
    {/each}
  </div>
{/snippet}

<DragDropProvider
  sensors={plannerSensors}
  onDragStart={dragController?.onDragStart}
  onDragMove={dragController?.onDragMove}
  onDragOver={dragController?.onDragOver}
  onDragEnd={dragController?.onDragEnd}
>
  <ScrollArea.Root class="tasks-planner" aria-label="Tasks planner">
    <section
      bind:this={plannerElement}
      class="tasks-planner__content"
      data-planner-legacy-drop-target={pointerDropTargetId ?? undefined}
      data-planner-drag-feedback={dragController
        ? dragController.isExternalTargetActive()
          ? dragController.movingTaskCount() > 1
            ? "external-stack"
            : "external"
          : dragController.movingTaskCount() > 1
            ? "stack"
            : "row"
        : "row"}
    >
    <header class="tasks-planner__header">
    <div>
      <h1>
        <span class="tasks-planner__title-icon" aria-hidden="true">
          {#if selectedArea}
            <FolderKanbanIcon />
          {:else if view === "today"}
            <ListTodoIcon />
          {:else if view === "upcoming"}
            <CalendarDaysIcon />
          {:else if view === "anytime"}
            <CircleEllipsisIcon />
          {:else if view === "someday"}
            <CalendarClockIcon />
          {:else}
            <ArchiveIcon />
          {/if}
        </span>
        {heading}
      </h1>
    </div>
    <span class="tasks-planner__count">{headingCount}</span>
    </header>

    {#if selectedArea}
      {@render taskList(areaTasks, selectedArea.title, `area:${selectedArea.id}`)}
    {:else if view === "today"}
      {#if snapshot.today.length || snapshot.thisEvening.length}
        {@render todaySection("Today", snapshot.today, "Today tasks", "today")}
        {#if snapshot.thisEvening.length || quickCreateEnabled}
          {@render todaySection(
            "This Evening",
            snapshot.thisEvening,
            "This evening tasks",
            "this-evening",
          )}
        {/if}
      {:else}
        {@render todaySection("Today", snapshot.today, "Today tasks", "today")}
      {/if}
    {:else if view === "upcoming"}
      {#if snapshot.upcomingRows.length}
        {@render upcomingRows(snapshot.upcomingRows)}
      {:else}
        {@render taskList([], "Upcoming tasks", "upcoming")}
      {/if}
    {:else if view === "anytime"}
      {@render taskList(snapshot.anytime, "Anytime tasks", "anytime")}
    {:else if view === "someday"}
      {@render taskList(snapshot.someday, "Someday tasks", "someday")}
    {:else}
      {#if snapshot.logbook.length}
        {#each snapshot.logbook as group (group.date)}
          {@render dateGroup(group)}
        {/each}
      {:else}
        <div class="tasks-planner__empty">{emptyLabel}</div>
      {/if}
    {/if}
    </section>
  </ScrollArea.Root>
</DragDropProvider>
