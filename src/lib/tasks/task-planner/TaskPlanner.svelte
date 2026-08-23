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
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import CircleEllipsisIcon from "@lucide/svelte/icons/circle-ellipsis";
  import CircleXIcon from "@lucide/svelte/icons/circle-x";
  import FlagIcon from "@lucide/svelte/icons/flag";
  import FolderKanbanIcon from "@lucide/svelte/icons/folder-kanban";
  import InboxIcon from "@lucide/svelte/icons/inbox";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import Clock3Icon from "@lucide/svelte/icons/clock-3";
  import SunriseIcon from "@lucide/svelte/icons/sunrise";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import CheckCheckIcon from "@lucide/svelte/icons/check-check";
  import { tick, type Snippet } from "svelte";

  import {
    buildTaskPlannerSnapshot,
    buildTaskPlannerDaySnapshot,
    buildTaskPlannerWeek,
    addPlannerDays,
    comparePlannerTasks,
    getPlannerSelectionPosition,
    listIdentitySlug,
    listsMatch,
    taskDateOnly,
    todayDateOnly,
    type TaskDaySection,
    type TaskPlannerDateGroup,
    type TaskOccurrenceHistoryRow,
    type TaskPlannerRowContext,
    type TaskPlannerUpcomingRow,
  } from '../../model';
  import {
    DEFAULT_TASKS_PLUGIN_SETTINGS,
    type TasksPluginSettings,
  } from "../../tasks-settings";
  import type {
    Task,
    TaskBucket,
    TaskCatalogPlanAt,
    TaskPriority,
    TaskQuickCreateInput,
    TaskWhen,
  } from '../../model';
  import { usePlannerDragController } from "../lib/planner-drag-context";
  import PlannerSortableList from "./PlannerSortableList.svelte";
  import PlannerSortableRow from "./PlannerSortableRow.svelte";
  import TaskQuickCreateActions from "./TaskQuickCreateActions.svelte";
  import TaskQuickCreateRow from "./TaskQuickCreateRow.svelte";
  import TaskOccurrenceHistory from "../task-occurrence-history/TaskOccurrenceHistory.svelte";

  type ApplicationSummary = {
    title: string;
    subtitle?: string;
    color?: string;
  };

  type PlannerView = TaskBucket;

  const daySections = [
    { id: "anytime", label: "Anytime", icon: Clock3Icon },
    { id: "morning", label: "Morning", icon: SunriseIcon },
    { id: "afternoon", label: "Afternoon", icon: SunIcon },
    { id: "evening", label: "Evening", icon: MoonIcon },
    { id: "done", label: "Done", icon: CheckCheckIcon },
  ] as const satisfies ReadonlyArray<{
    id: TaskDaySection;
    label: string;
    icon: typeof Clock3Icon;
  }>;

  let {
    tasks = [],
    now,
    clock = () => now ?? new Date(),
    settings = DEFAULT_TASKS_PLUGIN_SETTINGS,
    hideCompletedTasks = false,
    selectedDate = $bindable(todayDateOnly(now ?? clock())),
    actualToday = todayDateOnly(now ?? clock()),
    view = "today",
    area = null,
    taskRow,
    applicationSummaries = {},
    onOpenApplication = () => {},
    selectedTaskIds = [],
    draggedTaskIds = [],
    pointerDropTargetId = null,
    historyRows = [],
    onCreateTask = undefined,
  }: {
    tasks?: Task[];
    now?: Date;
    clock?: () => Date;
    settings?: TasksPluginSettings;
    hideCompletedTasks?: boolean;
    selectedDate?: string;
    actualToday?: string;
    view?: PlannerView;
    area?: string | null;
    taskRow?: Snippet<[Task, TaskPlannerRowContext]>;
    applicationSummaries?: Record<string, ApplicationSummary>;
    onOpenApplication?: (applicationId: string) => void | Promise<void>;
    selectedTaskIds?: string[];
    draggedTaskIds?: string[];
    pointerDropTargetId?: string | null;
    historyRows?: TaskOccurrenceHistoryRow[];
    onCreateTask?: (input: TaskQuickCreateInput) => void | Promise<void>;
  } = $props();

  let quickCreateTitles = $state<Record<string, string>>({});
  let quickCreateDueDates = $state<Record<string, string | undefined>>({});
  let quickCreatePriorities = $state<
    Record<string, TaskPriority | undefined>
  >({});
  let quickCreateSchedules = $state<
    Record<string, { scheduledAt?: string; when?: TaskWhen; planAt?: TaskCatalogPlanAt }>
  >({});
  let quickCreateActiveGroup = $state<string | null>(null);
  let quickCreateInteractionGroup = $state<string | null>(null);
  let plannerElement = $state<HTMLElement | null>(null);
  let expandedDaySections = $state<Record<TaskDaySection, boolean>>({
    anytime: true,
    morning: true,
    afternoon: true,
    evening: true,
    done: false,
  });
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
  const snapshot = $derived(buildTaskPlannerSnapshot(tasks, now ?? clock()));
  const daySnapshot = $derived(
    buildTaskPlannerDaySnapshot(tasks, selectedDate, settings, actualToday),
  );
  const visibleDaySnapshot = $derived({
    ...daySnapshot,
    done: hideCompletedTasks ? [] : daySnapshot.done,
  });
  const selectedWeek = $derived(buildTaskPlannerWeek(selectedDate, actualToday));
  const selectedDateHeading = $derived.by(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    return {
      weekday: new Intl.DateTimeFormat("en", { weekday: "long" }).format(date),
      monthYear: new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric",
      }).format(date),
    };
  });
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
        : view === "inbox"
          ? "Inbox"
          : view === "review"
            ? "Review"
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
      return (
        daySnapshot.anytime.length +
        daySnapshot.morning.length +
        daySnapshot.afternoon.length +
        daySnapshot.evening.length
      );
    if (view === "inbox") return snapshot.inbox.length;
    if (view === "review") return snapshot.review.length;
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
        : view === "review"
          ? "No tasks to review"
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
    return (
      task.status === "done" ||
      task.status === "completed" ||
      task.status === "canceled" ||
      Boolean(task.completedAt)
    );
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
    if (group.startsWith("today:")) return "today";
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
    planAt?: TaskCatalogPlanAt;
  } {
    const date = dateForGroup(group);
    if (date) return { scheduledAt: date };
    if (group === "today:anytime") {
      return { scheduledAt: selectedDate, planAt: "anytime" };
    }
    if (group === "today:morning") {
      return { scheduledAt: selectedDate, planAt: "morning" };
    }
    if (group === "today:afternoon") {
      return { scheduledAt: selectedDate, planAt: "afternoon" };
    }
    if (group === "today:evening") {
      return {
        scheduledAt: selectedDate,
        when: "this-evening",
        planAt: "evening",
      };
    }
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
    value: { scheduledAt?: string; when?: TaskWhen; planAt?: TaskCatalogPlanAt },
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
    if (group === "today:anytime") return daySnapshot.anytime;
    if (group === "today:morning") return daySnapshot.morning;
    if (group === "today:afternoon") return daySnapshot.afternoon;
    if (group === "today:evening") return daySnapshot.evening;
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
      planAt: schedule.planAt,
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

  function toggleDaySection(section: TaskDaySection) {
    expandedDaySections = {
      ...expandedDaySections,
      [section]: !expandedDaySections[section],
    };
  }

  function shiftSelectedWeek(days: number) {
    selectedDate = addPlannerDays(selectedDate, days);
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
    class:tasks-planner__task--canceled={task.status === "canceled"}
  >
    <span
      class="tasks-planner__check"
      data-task-checkbox-state={task.status === "canceled"
        ? "canceled"
        : isTaskDone(task)
          ? "completed"
          : "open"}
      aria-hidden="true"
    >
      {#if task.status === "canceled"}
        <CircleXIcon />
      {/if}
    </span>
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
    <TaskQuickCreateRow
      {group}
      value={quickCreateTitleFor(group)}
      active={quickCreateActiveGroup === group}
      onActivate={() => activateQuickCreate(group)}
      onValueChange={(value) => setQuickCreateTitle(group, value)}
      onSubmit={() => submitQuickCreate(group)}
      onFocusOut={(event) => handleQuickCreateFocusOut(event, group)}
    >
      {#snippet actions()}
        <TaskQuickCreateActions
          dueAt={quickCreateDueDateFor(group)}
          priority={quickCreatePriorityFor(group)}
          scheduledAt={quickCreateScheduleFor(group).scheduledAt}
          when={quickCreateScheduleFor(group).when}
          planAt={quickCreateScheduleFor(group).planAt}
          onDueAtChange={(dueAt) => setQuickCreateDueDate(group, dueAt)}
          onPriorityChange={(priority) =>
            setQuickCreatePriority(group, priority)}
          onScheduleChange={(schedule) =>
            setQuickCreateSchedule(group, schedule)}
          onInteractionChange={(open) =>
            handleQuickCreateInteraction(group, open)}
        />
      {/snippet}
    </TaskQuickCreateRow>
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

{#snippet dayTaskList(
  items: Task[],
  listLabel: string,
  group: string,
  allowQuickCreate: boolean,
)}
  <PlannerSortableList id={group} label={listLabel}>
    {#if allowQuickCreate}
      {@render quickCreateRow(group)}
    {/if}
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
{/snippet}

{#snippet daySection(
  section: TaskDaySection,
  title: string,
  icon: typeof Clock3Icon,
  items: Task[],
)}
  {@const expanded = expandedDaySections[section]}
  {@const group = `today:${section}`}
  {@const SectionIcon = icon}
  <section
    class="tasks-planner__section tasks-planner__day-section"
    data-day-section={section}
    data-day-section-expanded={expanded ? "true" : "false"}
  >
    <header class="tasks-planner__day-section-header">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`tasks-day-section-${section}`}
        onclick={() => toggleDaySection(section)}
      >
        <span class="tasks-planner__day-section-label">
          <SectionIcon aria-hidden="true" />
          <span>{title}</span>
        </span>
        <span class="tasks-planner__day-section-trailing">
          <small class="tasks-planner__day-section-count">{items.length}</small>
          <ChevronDownIcon aria-hidden="true" />
        </span>
      </button>
    </header>
    <div id={`tasks-day-section-${section}`}>
      {#if expanded}
        {@render dayTaskList(
          items,
          `${title} tasks`,
          group,
          section !== "done",
        )}
      {:else}
        <div class="tasks-planner__day-collapsed-drop" aria-hidden="true">
          {@render dayTaskList([], `${title} tasks`, group, false)}
        </div>
      {/if}
    </div>
  </section>
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
      class:tasks-planner__content--today={!selectedArea && view === "today"}
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
    {#if !selectedArea && view === "today"}
      <section class="tasks-planner__agenda-calendar" aria-label="Daily agenda date">
        <header class="tasks-planner__agenda-heading" aria-live="polite">
          <h1>{selectedDateHeading.weekday}</h1>
          <p>{selectedDateHeading.monthYear}</p>
        </header>
        <div class="tasks-planner__week-navigation">
          <button
            type="button"
            aria-label="Previous week"
            onclick={() => shiftSelectedWeek(-7)}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </button>
          <div class="tasks-planner__week" role="group" aria-label="Select agenda date">
            {#each selectedWeek as day (day.date)}
              <button
                type="button"
                class:tasks-planner__week-day--selected={day.selected}
                class:tasks-planner__week-day--today={day.today}
                aria-pressed={day.selected}
                aria-label={`${day.weekday} ${day.date}${day.today ? ", today" : ""}`}
                onclick={() => (selectedDate = day.date)}
              >
                <span
                  class="tasks-planner__week-label tasks-planner__week-label--short"
                >
                  {day.weekday}
                </span>
                <span
                  class="tasks-planner__week-label tasks-planner__week-label--narrow"
                  aria-hidden="true"
                >
                  {day.weekday.slice(0, 1)}
                </span>
                <strong>{day.dayNumber}</strong>
              </button>
            {/each}
          </div>
          <button
            type="button"
            aria-label="Next week"
            onclick={() => shiftSelectedWeek(7)}
          >
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </div>
      </section>
    {:else}
      <header class="tasks-planner__header">
        <div>
          <h1>
            <span class="tasks-planner__title-icon" aria-hidden="true">
              {#if selectedArea}
                <FolderKanbanIcon />
              {:else if view === "inbox"}
                <InboxIcon />
              {:else if view === "review"}
                <CircleAlertIcon />
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
    {/if}

    {#if selectedArea}
      {@render taskList(areaTasks, selectedArea.title, `area:${selectedArea.id}`)}
    {:else if view === "today"}
      {#if selectedDate < actualToday}
        <TaskOccurrenceHistory rows={historyRows} />
      {:else}
        <div class="tasks-planner__day-sections">
          {#each daySections as section (section.id)}
            {@render daySection(
              section.id,
              section.label,
              section.icon,
              visibleDaySnapshot[section.id],
            )}
          {/each}
        </div>
      {/if}
    {:else if view === "inbox"}
      {@render taskList(snapshot.inbox, "Inbox tasks", "inbox")}
    {:else if view === "review"}
      {@render taskList(snapshot.review, "Review tasks", "review")}
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
