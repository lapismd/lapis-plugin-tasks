<script lang="ts">
	import { onDestroy, tick, type Snippet } from 'svelte';
	import { move } from '@dnd-kit/helpers';
	import type { DragDropEventHandlers } from '@dnd-kit/svelte';
	import * as AlertDialog from '@lapismd/design-core/shadcn/alert-dialog';
	import {
		applicationTaskToTask,
		isTaskOverdueForDay,
		resolveTaskPlannerPlacement,
		taskToApplicationTask,
		todayDateOnly,
		type Task,
		type TaskBucket,
		type TaskAreaSummary,
		type TaskPlannerMovePatch,
		type TaskPlannerQuickPlacement,
		type TaskPlannerRowContext,
		type TaskQuickCreateInput,
		type ChecklistItem
	} from '../../model';
	import {
		DEFAULT_TASKS_PLUGIN_SETTINGS,
		type TasksPluginSettings
	} from '../../tasks-settings';
	import { getDueSummary, taskPreviewCloseAnimationMs } from '../../model';
	import type { ApplicationTask, JobApplication } from '../../model';
	import ApplicationPlannerTaskRow from '../application-planner-task-row/ApplicationPlannerTaskRow.svelte';
	import { asSnippet } from '../../as-snippet';
	import ApplicationTaskPlannerShell from '../application-task-planner-shell/ApplicationTaskPlannerShell.svelte';
	import {
		arrayMove,
		applyApplicationTaskPatch,
		buildPlannerDragLayout,
		buildPlannerPlacementPatch,
		changedPlannerPlacementTaskIds,
		getPlannerExternalDropTargetAt,
		normalizePlannerDragLayout,
		orderTaskIdsByVisiblePosition,
		orderedPlannerTasks,
		plannerPlacementsMatch,
		plannerMovePatchToApplicationPatch,
		plannerTaskKey,
		projectPlannerDragLayout,
		resolvePlannerTaskSelection,
		savePlannerDropPatches,
		taskProgressFor,
		visiblePlannerTasks,
		type PlannerDragLayout,
		type PlannerPointerDropTarget
	} from '../lib/application-task-planner-mode-helpers';
	import { providePlannerDragController } from '../lib/planner-drag-context';

	type PlannerDragStartEvent = Parameters<
		NonNullable<DragDropEventHandlers['onDragStart']>
	>[0];
	type PlannerDragMoveEvent = Parameters<
		NonNullable<DragDropEventHandlers['onDragMove']>
	>[0];
	type PlannerDragOverEvent = Parameters<
		NonNullable<DragDropEventHandlers['onDragOver']>
	>[0];
	type PlannerDragEndEvent = Parameters<
		NonNullable<DragDropEventHandlers['onDragEnd']>
	>[0];

	type ApplicationSummary = {
		title: string;
		subtitle?: string;
		color?: string;
	};

	let {
		tasks = [],
		now,
		clock = () => now ?? new Date(),
		settings = DEFAULT_TASKS_PLUGIN_SETTINGS,
		hideCompletedTasks = false,
		selectedDate = $bindable(todayDateOnly(now ?? clock())),
		applications = [],
		view = 'today',
		area = null,
		activeTaskId = null,
		detailsPresentation = 'inline',
		taskAreas = [],
		applicationSummaries = {},
		onActiveTaskChange = () => {},
		onSaveTask = () => {},
		onCreateTask = () => {},
		onDeleteTask = () => {},
		onLoadChecklist,
		onToggleChecklistItem,
		checklistRefreshVersion = 0,
		onSaveApplication = () => {},
		onOpenApplication = () => {},
		onDragTargetChange = () => {},
		reviewContent
	}: {
		tasks?: Task[];
		now?: Date;
		clock?: () => Date;
		settings?: TasksPluginSettings;
		hideCompletedTasks?: boolean;
		selectedDate?: string;
		applications?: JobApplication[];
		view?: TaskBucket;
		area?: string | null;
		activeTaskId?: string | null;
		/**
		 * inline: all open gestures expand the row.
		 * external: the open-details button notifies the host via onActiveTaskChange;
		 * while a host panel is already active, replace-selection also updates it;
		 * double-click and other inline gestures still expand the row.
		 */
		detailsPresentation?: 'inline' | 'external';
		taskAreas?: TaskAreaSummary[];
		applicationSummaries?: Record<string, ApplicationSummary>;
		onActiveTaskChange?: (taskId: string | null) => void | Promise<void>;
		onSaveTask?: (task: Task) => void | Promise<void>;
		onCreateTask?: (input: TaskQuickCreateInput) => void | Promise<void>;
		onDeleteTask?: (task: Task) => void | Promise<void>;
		onLoadChecklist?: (task: Task) => Promise<ChecklistItem[]>;
		onToggleChecklistItem?: (
			task: Task,
			item: ChecklistItem,
			checked: boolean
		) => Promise<ChecklistItem[]>;
		checklistRefreshVersion?: number;
		onSaveApplication?: (application: JobApplication) => void | Promise<void>;
		onOpenApplication?: (applicationId: string) => void | Promise<void>;
		onDragTargetChange?: (targetId: string | null) => void;
		reviewContent?: Snippet;
	} = $props();

	let expandedTaskId = $state<string | null>(null);
	let closingTaskId = $state<string | null>(null);
	let pendingExpandedTaskId = $state<string | null>(null);
	let pendingCreatedTaskIds = $state<Set<string> | null>(null);
	let rootElement = $state<HTMLElement | null>(null);
	let selectedTaskIds = $state<string[]>([]);
	let selectionAnchorTaskId = $state<string | null>(null);
	const selectOnSurfaceClick = $derived(
		detailsPresentation === 'external' && activeTaskId !== null
	);
	let draggedTaskIds = $state<string[]>([]);
	let pointerDragActive = $state(false);
	let pointerDragTimestamp = $state<Date | null>(null);
	let pointerDragBaseTasks = $state<Task[] | null>(null);
	let pointerDragLayout = $state<PlannerDragLayout | null>(null);
	let pointerDragSourceTaskId = $state<string | null>(null);
	let pointerProjectedTasks = $state<Task[] | null>(null);
	let optimisticTasks = $state<Task[] | null>(null);
	let pointerDropTarget = $state<PlannerPointerDropTarget | null>(null);
	let pointerDropTargetId = $state<string | null>(null);
	let dragPreviewPointer = $state<{ x: number; y: number } | null>(null);
	let dragPreviewOverSidebar = $state(false);
	let scheduleDropTaskIds = $state<string[]>([]);
	let scheduleDropOpen = $state(false);
	let scheduleDropValue = $state<string | null>(null);
	let scheduleDropWhen = $state<string | null>(null);
	let scheduleDropPlanAt = $state<string | null>(null);
	let logbookReopenConfirmOpen = $state(false);
	let pendingLogbookReopen = $state<{
		task: Task;
		currentTask: ApplicationTask;
		label: string;
	} | null>(null);
	let closeAnimationTimer: ReturnType<typeof setTimeout> | null = null;

	const displayTasks = $derived(pointerProjectedTasks ?? optimisticTasks ?? tasks);
	const actualToday = $derived(todayDateOnly(now ?? clock()));
	const currentTime = () => now ?? clock();
	const dragPreviewTask = $derived.by(() =>
		draggedTaskIds[0]
			? (displayTasks.find((task) => task.id === draggedTaskIds[0]) ?? null)
			: null
	);
	const dragPreviewDueLabel = $derived.by(() => {
		const summary = getDueSummary(dragPreviewTask?.dueAt);
		return summary?.shortDate ?? '';
	});

	providePlannerDragController({
		onDragStart: handlePlannerDragStart,
		onDragMove: handlePlannerDragMove,
		onDragOver: handlePlannerDragOver,
		onDragEnd: handlePlannerDragEnd,
		isExternalTargetActive: () => dragPreviewOverSidebar,
		movingTaskCount: () => draggedTaskIds.length
	});

	onDestroy(() => {
		cancelCloseAnimation();
		if (typeof window !== 'undefined') clearPointerDrag();
	});

	function cancelCloseAnimation() {
		if (!closeAnimationTimer) return;
		clearTimeout(closeAnimationTimer);
		closeAnimationTimer = null;
	}

	function finishClosingTask() {
		closeAnimationTimer = null;
		const nextTaskId = pendingExpandedTaskId;
		closingTaskId = null;
		pendingExpandedTaskId = null;
		if (nextTaskId) expandedTaskId = nextTaskId;
	}

	function startClosingTask(nextTaskId: string | null) {
		cancelCloseAnimation();
		if (!expandedTaskId) {
			closingTaskId = null;
			pendingExpandedTaskId = null;
			if (nextTaskId) expandedTaskId = nextTaskId;
			return;
		}

		closingTaskId = expandedTaskId;
		pendingExpandedTaskId = nextTaskId;
		expandedTaskId = null;
		closeAnimationTimer = setTimeout(
			finishClosingTask,
			taskPreviewCloseAnimationMs(rootElement?.ownerDocument.defaultView ?? window)
		);
	}

	function clearExpansion() {
		cancelCloseAnimation();
		expandedTaskId = null;
		closingTaskId = null;
		pendingExpandedTaskId = null;
	}

	function requestOpenTask(
		task: Task,
		source: 'details-button' | 'inline' = 'inline'
	) {
		// Host panel: open-details opens/toggles externally. While a host panel
		// is already active, replace-selection syncs via selectTask.
		// Double-click and other inline gestures keep row expand.
		if (detailsPresentation === 'external' && source === 'details-button') {
			void onActiveTaskChange(activeTaskId === task.id ? null : task.id);
			return;
		}

		const taskKey = plannerTaskKey(task);
		if (expandedTaskId === taskKey) {
			startClosingTask(null);
			if (detailsPresentation !== 'external') void onActiveTaskChange(null);
			return;
		}
		if (closingTaskId) {
			pendingExpandedTaskId = taskKey;
			if (detailsPresentation !== 'external') void onActiveTaskChange(task.id);
			return;
		}
		if (expandedTaskId) {
			startClosingTask(taskKey);
			if (detailsPresentation !== 'external') void onActiveTaskChange(task.id);
			return;
		}
		expandedTaskId = taskKey;
		if (detailsPresentation !== 'external') void onActiveTaskChange(task.id);
	}

	async function focusTaskById(taskId: string, expandInline = true) {
		const task = tasks.find((entry) => entry.id === taskId);
		if (!task) return;
		const taskKey = plannerTaskKey(task);
		if (expandInline) {
			cancelCloseAnimation();
			closingTaskId = null;
			pendingExpandedTaskId = null;
			expandedTaskId = taskKey;
		}
		selectedTaskIds = [task.id];
		selectionAnchorTaskId = task.id;
		await tick();
		rootElement
			?.querySelector<HTMLElement>(`[data-planner-task-id="${task.id}"]`)
			?.scrollIntoView({ block: 'center' });
	}

	$effect(() => {
		const previousTaskIds = pendingCreatedTaskIds;
		if (!previousTaskIds) return;
		const task = tasks.find((entry) => !previousTaskIds.has(entry.id));
		if (!task) return;
		pendingCreatedTaskIds = null;
		cancelCloseAnimation();
		const taskKey = plannerTaskKey(task);
		closingTaskId = null;
		pendingExpandedTaskId = null;
		if (detailsPresentation === 'inline') {
			expandedTaskId = taskKey;
		}
		selectedTaskIds = [task.id];
		selectionAnchorTaskId = task.id;
		void onActiveTaskChange(task.id);
	});

	$effect(() => {
		if (!activeTaskId) return;
		void focusTaskById(activeTaskId, detailsPresentation === 'inline');
	});

	function requestDismissTask() {
		if (expandedTaskId) {
			startClosingTask(null);
			if (detailsPresentation !== 'external') void onActiveTaskChange(null);
			return;
		}
		pendingExpandedTaskId = null;
	}

	function shouldKeepTaskOpen(target: Element) {
		if (target.closest('[data-task-preview-state="expanded"], [data-task-preview-state="closing"]')) {
			return true;
		}

		if (
			target.closest('[data-planner-task-key]')?.getAttribute('data-planner-task-key') ===
			expandedTaskId
		) {
			return true;
		}

		return Boolean(
			target.closest(
				[
					'dialog',
					'[popover]',
					"[role='alertdialog']",
					"[role='dialog']:not(.application-detail-screen)",
					"[data-slot='dialog-content']",
					"[data-slot='dialog-overlay']",
					"[data-slot='alert-dialog-content']",
					"[data-slot='alert-dialog-overlay']",
					'[data-task-due-picker]',
					'[data-task-when-picker]',
					'[data-task-at-picker]',
					'[data-task-area-picker]',
					'.task-when-picker',
					'.task-when-picker__panel',
					'.task-at-picker',
					'.task-at-picker__panel',
					'.application-task-area-picker__panel'
				].join(',')
			)
		);
	}

	function handleOutsideTask(event: Event) {
		if (!expandedTaskId || !(event.target instanceof Element)) return;
		if (shouldKeepTaskOpen(event.target)) return;
		requestDismissTask();
	}

	$effect(() => {
		if (!expandedTaskId) return;
		document.addEventListener('pointerdown', handleOutsideTask, true);
		document.addEventListener('focusin', handleOutsideTask, true);
		return () => {
			document.removeEventListener('pointerdown', handleOutsideTask, true);
			document.removeEventListener('focusin', handleOutsideTask, true);
		};
	});

	$effect(() => {
		if (!logbookReopenConfirmOpen && pendingLogbookReopen) pendingLogbookReopen = null;
	});

	$effect(() => {
		const optimistic = optimisticTasks;
		if (optimistic && plannerPlacementsMatch(tasks, optimistic)) optimisticTasks = null;
	});

	async function saveTaskPatch(task: Task, patch: Partial<ApplicationTask>) {
		const updatedAt = currentTime().toISOString();
		if (!task.applicationId) {
			await onSaveTask(applyApplicationTaskPatch(task, patch, updatedAt));
			return;
		}

		const application = applications.find((entry) => entry.id === task.applicationId);
		const currentTask = application?.tasks?.find((entry) => entry.id === task.id);
		const nextTask: ApplicationTask = {
			...taskToApplicationTask(task),
			...currentTask,
			...patch,
			updatedAt: patch.updatedAt ?? updatedAt
		};
		await onSaveTask(applicationTaskToTask(task.applicationId, nextTask, task));
	}

	function saveMovePatch(task: Task, patch: TaskPlannerMovePatch) {
		void saveTaskPatch(task, plannerMovePatchToApplicationPatch(patch));
	}

	function resetDoneCheckbox(event: Event | undefined, checked: boolean) {
		if (!(event?.target instanceof HTMLInputElement)) return;
		event.target.checked = checked;
	}

	function requestLogbookReopen(task: Task, currentTask: ApplicationTask, event?: Event) {
		event?.preventDefault();
		resetDoneCheckbox(event, currentTask.done);
		pendingLogbookReopen = {
			task,
			currentTask,
			label: task.title.trim() || currentTask.body.trim() || 'this task'
		};
		logbookReopenConfirmOpen = true;
	}

	function clearLogbookReopenConfirm() {
		logbookReopenConfirmOpen = false;
		pendingLogbookReopen = null;
	}

	function confirmPendingLogbookReopen() {
		const pending = pendingLogbookReopen;
		if (!pending) return;
		clearLogbookReopenConfirm();
		void saveTaskPatch(pending.task, {
			done: false,
			status: 'open',
			completedAt: undefined
		});
	}

	function toggleTaskDone(task: Task, event?: Event) {
		const currentTask =
			applications
				.find((application) => application.id === task.applicationId)
				?.tasks?.find((entry) => entry.id === task.id) ?? taskToApplicationTask(task);
		if (view === 'logbook' && currentTask.done) {
			requestLogbookReopen(task, currentTask, event);
			return;
		}
		const done = !currentTask.done;
		void saveTaskPatch(task, {
			done,
			status: done ? 'completed' : 'open',
			completedAt: done ? (currentTask.completedAt ?? currentTime().toISOString()) : undefined
		});
	}

	function removeTask(task: Task) {
		if (expandedTaskId === plannerTaskKey(task)) clearExpansion();
		if (activeTaskId === task.id) void onActiveTaskChange(null);
		if (!task.applicationId) {
			void onDeleteTask(task);
			return;
		}
		const application = applications.find((entry) => entry.id === task.applicationId);
		if (!application) {
			void onDeleteTask(task);
			return;
		}
		const nextTasks = (application.tasks ?? []).filter((entry) => entry.id !== task.id);
		void onSaveApplication({
			...application,
			tasks: nextTasks.length ? nextTasks : undefined,
			steps: nextTasks.length ? taskProgressFor(nextTasks) : undefined,
			updatedAt: currentTime().toISOString()
		});
	}

	function resolveDragTaskIds(sourceTaskId: string, sourceTasks = displayTasks) {
		return selectedTaskIds.includes(sourceTaskId)
			? orderTaskIdsByVisiblePosition(
					sourceTasks,
					view,
					area,
					selectedTaskIds,
					currentTime(),
					selectedDate,
					settings
				)
			: [sourceTaskId];
	}

	function tasksByIds(taskIds: string[], sourceTasks = displayTasks) {
		return taskIds
			.map((id) => sourceTasks.find((task) => task.id === id) ?? null)
			.filter((task): task is Task => Boolean(task));
	}

	function selectTask(task: Task, event: MouseEvent) {
		const mode = event.shiftKey ? 'range' : event.metaKey || event.ctrlKey ? 'toggle' : 'replace';
		const selection = resolvePlannerTaskSelection(
			visiblePlannerTasks(displayTasks, view, area, currentTime(), selectedDate, settings).map(
				(visibleTask) => visibleTask.id
			),
			selectedTaskIds,
			selectionAnchorTaskId,
			task.id,
			mode
		);
		selectedTaskIds = selection.taskIds;
		selectionAnchorTaskId = selection.anchorTaskId;
		// Keep an already-open host detail panel in sync with replace selection.
		if (
			detailsPresentation === 'external' &&
			activeTaskId !== null &&
			mode === 'replace' &&
			task.id !== activeTaskId
		) {
			void onActiveTaskChange(task.id);
		}
	}

	function clearTaskSelection() {
		selectedTaskIds = [];
		selectionAnchorTaskId = null;
	}

	function projectedTaskPatch(task: Task): Partial<ApplicationTask> {
		return {
			dueAt: task.dueAt,
			scheduledAt: task.scheduledAt,
			when: task.when,
			start: task.start,
			planDate: task.planDate,
			planAt: task.planAt,
			deadline: task.deadline,
			inbox: task.inbox,
			listId: task.listId,
			status: task.status,
			done:
				task.status === 'done' ||
				task.status === 'completed' ||
				task.status === 'canceled' ||
				Boolean(task.completedAt),
			completedAt: task.completedAt,
			order: task.order,
			updatedAt: task.updatedAt
		};
	}

	async function commitTaskProjection(before: Task[], after: Task[]) {
		optimisticTasks = after;
		const changedIds = new Set(changedPlannerPlacementTaskIds(before, after));
		const beforeById = new Map(before.map((task) => [task.id, task] as const));
		await Promise.all(
			after
				.filter((task) => changedIds.has(task.id))
				.map((task) =>
					saveTaskPatch(beforeById.get(task.id) ?? task, projectedTaskPatch(task))
				)
		);
	}

	function saveTaskOrder(nextTasks: Task[]) {
		const orderByTaskId = new Map(
			orderedPlannerTasks(nextTasks).map((entry) => [entry.task.id, entry.order] as const)
		);
		const before = displayTasks;
		const projected = before.map((task) => {
			const order = orderByTaskId.get(task.id);
			return order === undefined ? task : { ...task, order };
		});
		void commitTaskProjection(before, projected);
	}

	function reorderTaskGroup(groupTasks: Task[], from: number, to: number) {
		if (from < 0 || to < 0 || from >= groupTasks.length || to >= groupTasks.length || from === to) {
			return groupTasks;
		}
		const nextTasks = arrayMove(groupTasks, from, to);
		saveTaskOrder(nextTasks);
		return nextTasks;
	}

	function moveTask(_task: Task, direction: -1 | 1, context: TaskPlannerRowContext) {
		reorderTaskGroup(context.tasks, context.index, context.index + direction);
	}

	function handlePlannerDragStart(event: PlannerDragStartEvent) {
		const sourceTaskId = String(event.operation.source?.id ?? '');
		if (!sourceTaskId) return;

		const baseTasks = [...displayTasks];
		const timestamp = currentTime();
		const nextDraggedTaskIds = resolveDragTaskIds(sourceTaskId, baseTasks);
		if (!nextDraggedTaskIds.length) return;

		draggedTaskIds = nextDraggedTaskIds;
		pointerDragActive = true;
		pointerDragTimestamp = timestamp;
		pointerDragBaseTasks = baseTasks;
		pointerDragLayout = buildPlannerDragLayout(
			baseTasks,
			view,
			area,
			timestamp,
			selectedDate,
			settings
		);
		pointerDragSourceTaskId = sourceTaskId;

		const activator = event.nativeEvent ?? event.operation.activatorEvent;
		if (activator instanceof PointerEvent) {
			updateExternalDragTarget(activator.clientX, activator.clientY);
		}
	}

	function handlePlannerDragMove(event: PlannerDragMoveEvent) {
		if (!pointerDragActive) return;
		const nativeEvent = event.nativeEvent;
		if (nativeEvent instanceof PointerEvent) {
			updateExternalDragTarget(nativeEvent.clientX, nativeEvent.clientY);
		}
	}

	function handlePlannerDragOver(event: PlannerDragOverEvent) {
		const layout = pointerDragLayout;
		const sourceTaskId = pointerDragSourceTaskId;
		const baseTasks = pointerDragBaseTasks;
		if (
			!pointerDragActive ||
			dragPreviewOverSidebar ||
			!layout ||
			!sourceTaskId ||
			!baseTasks
		) {
			return;
		}

		const movedLayout = move(layout, event) as PlannerDragLayout;
		const normalizedLayout = normalizePlannerDragLayout(
			movedLayout,
			draggedTaskIds,
			sourceTaskId
		);
		pointerDragLayout = normalizedLayout;
		pointerProjectedTasks = projectPlannerDragLayout(
			baseTasks,
			draggedTaskIds,
			normalizedLayout,
			pointerDragTimestamp ?? currentTime(),
			selectedDate
		);
	}

	function handlePlannerDragEnd(event: PlannerDragEndEvent) {
		if (!pointerDragActive) return;
		const movedIds = draggedTaskIds;
		const target = pointerDropTarget;
		const before = pointerDragBaseTasks;
		const projected = pointerProjectedTasks;
		const canceled = event.canceled;
		clearPointerDrag();

		if (canceled || !before || movedIds.length === 0) return;
		if (target?.mode === 'valid') {
			void handleDrop(movedIds, target.data);
			return;
		}
		if (projected) void commitTaskProjection(before, projected);
	}

	function clearPointerDrag() {
		pointerDragActive = false;
		pointerDragTimestamp = null;
		pointerDragBaseTasks = null;
		pointerDragLayout = null;
		pointerDragSourceTaskId = null;
		pointerProjectedTasks = null;
		pointerDropTarget = null;
		if (pointerDropTargetId !== null) onDragTargetChange(null);
		pointerDropTargetId = null;
		draggedTaskIds = [];
		dragPreviewPointer = null;
		dragPreviewOverSidebar = false;
	}

	function updateExternalDragTarget(x: number, y: number) {
		dragPreviewPointer = { x, y };
		const target = getPlannerExternalDropTargetAt(rootElement, x, y);
		pointerDropTarget = target;
		dragPreviewOverSidebar = Boolean(target);
		const nextTargetId = target?.id ?? null;
		if (nextTargetId === pointerDropTargetId) return;
		pointerDropTargetId = nextTargetId;
		onDragTargetChange(nextTargetId);
	}

	async function handleDrop(movedIds: string[], target: Record<string, unknown>) {
		const movingTasks = tasksByIds(movedIds);
		if (!movingTasks.length) return;
		if (target.type === 'planner-sidebar-bucket') {
			const bucket = target.bucket;
			if (bucket === 'upcoming') {
				openScheduleDropDialog(movedIds);
				return;
			}
			if (bucket === 'today' || bucket === 'anytime' || bucket === 'someday' || bucket === 'logbook') {
				savePlannerDropPatches(movingTasks, { bucket }, saveMovePatch);
			}
			return;
		}
		if (target.type === 'planner-sidebar-list') {
			const listId = typeof target.listId === 'string' ? target.listId : '';
			const title =
				typeof target.title === 'string' && target.title.trim()
					? target.title.trim()
					: listId;
			if (!listId) return;
			for (const task of movingTasks) {
				void saveTaskPatch(task, {
					listId,
					areas: title ? [title] : []
				});
			}
		}

	}

	function openScheduleDropDialog(movedIds: string[]) {
		const [firstTask] = tasksByIds(movedIds);
		scheduleDropTaskIds = movedIds;
		scheduleDropValue = firstTask?.scheduledAt ?? null;
		scheduleDropWhen = firstTask?.when ?? null;
		scheduleDropPlanAt = firstTask?.planAt ?? null;
		scheduleDropOpen = true;
	}

	function closeScheduleDropDialog() {
		scheduleDropOpen = false;
		scheduleDropTaskIds = [];
		scheduleDropValue = null;
		scheduleDropWhen = null;
		scheduleDropPlanAt = null;
	}

	function applyScheduleDropDate(date: string) {
		const movingTasks = tasksByIds(scheduleDropTaskIds);
		closeScheduleDropDialog();
		savePlannerDropPatches(movingTasks, { bucket: 'upcoming', date }, saveMovePatch);
	}

	function applyScheduleDropPlacement(placement: TaskPlannerQuickPlacement) {
		const movingTasks = tasksByIds(scheduleDropTaskIds);
		closeScheduleDropDialog();
		for (const task of movingTasks) saveMovePatch(task, buildPlannerPlacementPatch(task, placement));
	}

	function clearScheduleDrop() {
		const movingTasks = tasksByIds(scheduleDropTaskIds);
		closeScheduleDropDialog();
		for (const task of movingTasks) {
				saveMovePatch(task, {
					...resolveTaskPlannerPlacement('clear'),
					updatedAt: currentTime().toISOString()
				});
		}
	}

	async function createPlannerTask(input: TaskQuickCreateInput) {
		pendingCreatedTaskIds = new Set(tasks.map((task) => task.id));
		await onCreateTask(input);
	}
</script>

{#snippet plannerTaskRow(task: Task, context: TaskPlannerRowContext)}
	{@const application = task.applicationId ? applicationSummaries[task.applicationId] : null}
	{@const taskKey = plannerTaskKey(task)}
		<ApplicationPlannerTaskRow
		{task}
		{application}
		areaOptions={taskAreas.map((item) => item.title)}
		taskIndex={context.index}
		taskTotal={context.total}
		sortableGroup={context.group}
		dragging={Boolean(context.dragged)}
		selected={Boolean(context.selected)}
		overdue={view === 'today' && !area && isTaskOverdueForDay(task, selectedDate)}
		now={currentTime()}
		selectionPosition={context.selectionPosition ?? null}
		expanded={expandedTaskId === taskKey}
		closing={closingTaskId === taskKey}
		selectOnSurfaceClick={selectOnSurfaceClick}
		onRequestOpen={(_taskId, source) => requestOpenTask(task, source)}
		onStartTitleEdit={clearTaskSelection}
		onSelectTask={selectTask}
		onToggleDone={toggleTaskDone}
		onUpdateTask={(updatedTask, patch) => void saveTaskPatch(updatedTask, patch)}
		onRemoveTask={removeTask}
		{onLoadChecklist}
		{onToggleChecklistItem}
		{checklistRefreshVersion}
		onMoveTask={(updatedTask, direction) => moveTask(updatedTask, direction, context)}
		onOpenApplication={onOpenApplication}
	/>
{/snippet}

{#snippet plannerDragPreviewRow(task: Task)}
	{@const application = task.applicationId ? applicationSummaries[task.applicationId] : null}
	<ApplicationPlannerTaskRow
		{task}
		{application}
		areaOptions={taskAreas.map((item) => item.title)}
		taskIndex={0}
		taskTotal={1}
		sortableGroup="planner-drag-preview"
		dragging
		dragPreview
		now={currentTime()}
	/>
{/snippet}

{#if reviewContent}
	{@render reviewContent()}
{/if}

<ApplicationTaskPlannerShell
	bind:rootElement
	tasks={displayTasks}
	{now}
	{clock}
	{settings}
	{hideCompletedTasks}
	bind:selectedDate
	{actualToday}
	{view}
	{area}
	taskRow={asSnippet(plannerTaskRow)}
	{applicationSummaries}
	onCreateTask={createPlannerTask}
	{selectedTaskIds}
	{draggedTaskIds}
	{pointerDropTargetId}
	{scheduleDropOpen}
	{scheduleDropValue}
	{scheduleDropWhen}
	{scheduleDropPlanAt}
	dragPreviewTask={dragPreviewTask}
	dragPreviewPointer={dragPreviewPointer}
	dragPreviewRow={asSnippet(plannerDragPreviewRow)}
	dragPreviewOverSidebar={dragPreviewOverSidebar}
	dragPreviewDueLabel={dragPreviewDueLabel}
	onOpenApplication={onOpenApplication}
	onCloseScheduleDrop={closeScheduleDropDialog}
	onClearScheduleDrop={clearScheduleDrop}
	onSelectScheduleDate={applyScheduleDropDate}
	onSelectSchedulePlacement={applyScheduleDropPlacement}
/>

<AlertDialog.Root bind:open={logbookReopenConfirmOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Move task back to Todo?</AlertDialog.Title>
			<AlertDialog.Description>
				This will reopen "{pendingLogbookReopen?.label ?? 'this task'}" and remove it from the
				Logbook.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="sm" onclick={clearLogbookReopenConfirm}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action size="sm" onclick={confirmPendingLogbookReopen}>
				Move to Todo
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
