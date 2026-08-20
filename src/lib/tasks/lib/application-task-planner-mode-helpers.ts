import {
	buildTaskPlannerMovePatch,
	buildTaskPlannerDaySectionPatch,
	buildTaskPlannerDaySnapshot,
	buildTaskPlannerSnapshot,
	comparePlannerTasks,
	resolveTaskPlannerPlacement,
	todayDateOnly,
	type Task,
	type TaskBucket,
	type TaskPlannerDropTarget,
	type TaskPlannerMovePatch,
	type TaskPlannerQuickPlacement
} from '../../model';
import {
	DEFAULT_TASKS_PLUGIN_SETTINGS,
	type TasksPluginSettings
} from '../../tasks-settings';

import type { ApplicationTask } from '../../model';

export type PlannerPointerDropTarget = {
	id: string;
	mode: 'valid' | 'blocked';
	data: Record<string, unknown>;
};

export type PlannerDragLayout = Record<string, string[]>;

export type PlannerSelectionMode = 'replace' | 'toggle' | 'range';

export type PlannerTaskSelection = {
	taskIds: string[];
	anchorTaskId: string | null;
};

export type PlannerDropDescriptor =
	| {
			type: 'planner-day-section';
			listId: string;
			section: 'anytime' | 'morning' | 'afternoon' | 'evening' | 'done';
	  }
	| {
			type: 'planner-list';
			listId: string;
			bucket: TaskBucket;
			date?: string;
	  }
	| {
			type: 'planner-list';
			listId: string;
			orderOnly: true;
	  };

const plannerPlacementKeys = [
	'dueAt',
	'scheduledAt',
	'when',
	'start',
	'planDate',
	'planAt',
	'deadline',
	'inbox',
	'listId',
	'status',
	'completedAt',
	'order'
] as const satisfies ReadonlyArray<keyof Task>;

function isClosedPlannerTask(task: Task) {
	return (
		task.status === 'done' ||
		task.status === 'completed' ||
		task.status === 'canceled' ||
		Boolean(task.completedAt)
	);
}

export function plannerTaskKey(task: Pick<Task, 'id' | 'applicationId'>) {
	return `${task.applicationId ?? 'task'}:${task.id}`;
}

export function taskProgressFor(taskList: ApplicationTask[]) {
	return {
		done: taskList.filter((task) => task.done).length,
		total: taskList.length
	};
}

export function applyApplicationTaskPatch(
	task: Task,
	patch: Partial<ApplicationTask>,
	updatedAt: string
): Task {
	const has = (key: keyof ApplicationTask) =>
		Object.prototype.hasOwnProperty.call(patch, key);
	return {
		...task,
		title: patch.body ?? task.title,
		status:
			patch.status ??
			(patch.done === undefined ? task.status : patch.done ? 'completed' : 'open'),
		priority: has('priority') ? patch.priority : task.priority,
		linkedTo: has('linkedTo') ? patch.linkedTo : task.linkedTo,
		dueAt: has('dueAt') ? patch.dueAt : task.dueAt,
		scheduledAt: has('scheduledAt') ? patch.scheduledAt : task.scheduledAt,
		when: has('when') ? patch.when : task.when,
		start: has('start') ? patch.start : task.start,
		planDate: has('planDate') ? patch.planDate : task.planDate,
		planAt: has('planAt') ? patch.planAt : task.planAt,
		repeat: has('repeat') ? patch.repeat : task.repeat,
		deadline: has('deadline') ? patch.deadline : task.deadline,
		inbox: has('inbox') ? patch.inbox : task.inbox,
		listId: has('listId') ? patch.listId : task.listId,
		completedAt: has('completedAt') ? patch.completedAt : task.completedAt,
		order: has('order') ? patch.order : task.order,
		areas: has('areas') ? (patch.areas ?? []) : task.areas,
		notes: has('notes') ? (patch.notes ?? '') : task.notes,
		updatedAt: patch.updatedAt ?? updatedAt
	};
}

export function arrayMove<T>(values: T[], from: number, to: number) {
	const next = [...values];
	const [item] = next.splice(from, 1);
	if (item === undefined) return next;
	next.splice(to, 0, item);
	return next;
}

export function plannerMovePatchToApplicationPatch(
	patch: TaskPlannerMovePatch
): Partial<ApplicationTask> {
	const nextPatch: Partial<ApplicationTask> = {};
	if ('dueAt' in patch) nextPatch.dueAt = patch.dueAt ?? undefined;
	if ('scheduledAt' in patch) nextPatch.scheduledAt = patch.scheduledAt ?? undefined;
	if ('when' in patch) nextPatch.when = patch.when ?? undefined;
	if ('start' in patch) nextPatch.start = patch.start ?? undefined;
	if ('planDate' in patch) nextPatch.planDate = patch.planDate ?? undefined;
	if ('planAt' in patch) nextPatch.planAt = patch.planAt ?? undefined;
	if ('inbox' in patch) nextPatch.inbox = patch.inbox;
	if ('listId' in patch) nextPatch.listId = patch.listId ?? undefined;
	if ('deadline' in patch) nextPatch.dueAt = patch.deadline ?? nextPatch.dueAt;
	if ('status' in patch) nextPatch.status = patch.status;
	if ('completedAt' in patch) nextPatch.completedAt = patch.completedAt ?? undefined;
	if ('order' in patch) nextPatch.order = patch.order;
	if ('updatedAt' in patch) nextPatch.updatedAt = patch.updatedAt;
	if (patch.status === 'done' || patch.status === 'completed') nextPatch.done = true;
	if (patch.status === 'canceled') nextPatch.done = true;
	if (patch.status === 'open' || patch.status === 'todo') nextPatch.done = false;
	return nextPatch;
}

export function visiblePlannerTasks(
	tasks: Task[],
	taskView: TaskBucket,
	taskArea: string | null,
	now = new Date(),
	selectedDate = todayDateOnly(now),
	settings: TasksPluginSettings = DEFAULT_TASKS_PLUGIN_SETTINGS
) {
	const snapshot = buildTaskPlannerSnapshot(tasks, now);
	if (taskArea) {
		const area = taskArea.toLowerCase();
		return tasks
			.filter((task) => !isClosedPlannerTask(task))
			.filter((task) =>
				task.areas.some(
					(taskAreaName) =>
						taskAreaName.toLowerCase() === area ||
						taskAreaName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === area
				)
			);
	}
	if (taskView === 'inbox') return snapshot.inbox;
	if (taskView === 'today') {
		const day = buildTaskPlannerDaySnapshot(tasks, selectedDate, settings, todayDateOnly(now));
		return [...day.anytime, ...day.morning, ...day.afternoon, ...day.evening, ...day.done];
	}
	if (taskView === 'upcoming')
		return snapshot.upcomingRows.flatMap((row) => (row.kind === 'day' ? row.tasks : []));
	if (taskView === 'anytime') return snapshot.anytime;
	if (taskView === 'someday') return snapshot.someday;
	if (taskView === 'review') return snapshot.review;
	return snapshot.logbook.flatMap((group) => group.tasks);
}

export function plannerTasksForListId(
	tasks: Task[],
	listId: string,
	now = new Date(),
	selectedDate = todayDateOnly(now),
	settings: TasksPluginSettings = DEFAULT_TASKS_PLUGIN_SETTINGS
) {
	const snapshot = buildTaskPlannerSnapshot(tasks, now);
	if (listId === 'inbox') return snapshot.inbox;
	if (listId.startsWith('today:')) {
		const section = listId.slice('today:'.length) as
			| 'anytime'
			| 'morning'
			| 'afternoon'
			| 'evening'
			| 'done';
		const day = buildTaskPlannerDaySnapshot(tasks, selectedDate, settings, todayDateOnly(now));
		return day[section] ?? [];
	}
	if (listId === 'anytime') return snapshot.anytime;
	if (listId === 'someday') return snapshot.someday;
	if (listId === 'review') return snapshot.review;
	if (listId.startsWith('upcoming:')) {
		const date = listId.slice('upcoming:'.length);
		return snapshot.upcoming.find((group) => group.date === date)?.tasks ?? [];
	}
	if (listId.startsWith('logbook:')) {
		const date = listId.slice('logbook:'.length);
		return snapshot.logbook.find((group) => group.date === date)?.tasks ?? [];
	}
	if (listId.startsWith('area:')) {
		const area = listId.slice('area:'.length).toLowerCase();
		return tasks
			.filter((task) => !isClosedPlannerTask(task))
			.filter((task) =>
				task.areas.some(
					(taskAreaName) =>
						taskAreaName.toLowerCase() === area ||
						taskAreaName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === area
				)
			);
	}
	return [];
}

export function buildPlannerDragLayout(
	tasks: Task[],
	taskView: TaskBucket,
	taskArea: string | null,
	now = new Date(),
	selectedDate = todayDateOnly(now),
	settings: TasksPluginSettings = DEFAULT_TASKS_PLUGIN_SETTINGS
): PlannerDragLayout {
	if (taskArea) {
		const area = taskArea.toLowerCase();
		return {
			[`area:${taskArea}`]: tasks
				.filter((task) => !isClosedPlannerTask(task))
				.filter((task) =>
					task.areas.some(
						(taskAreaName) =>
							taskAreaName.toLowerCase() === area ||
							taskAreaName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === area
					)
				)
				.sort(comparePlannerTasks)
				.map((task) => task.id)
		};
	}

	const snapshot = buildTaskPlannerSnapshot(tasks, now);
	if (taskView === 'inbox') {
		return { inbox: snapshot.inbox.map((task) => task.id) };
	}
	if (taskView === 'today') {
		const day = buildTaskPlannerDaySnapshot(tasks, selectedDate, settings, todayDateOnly(now));
		return {
			'today:anytime': day.anytime.map((task) => task.id),
			'today:morning': day.morning.map((task) => task.id),
			'today:afternoon': day.afternoon.map((task) => task.id),
			'today:evening': day.evening.map((task) => task.id),
			'today:done': day.done.map((task) => task.id)
		};
	}
	if (taskView === 'review') {
		return { review: snapshot.review.map((task) => task.id) };
	}
	if (taskView === 'upcoming') {
		return Object.fromEntries(
			snapshot.upcomingRows
				.filter((row) => row.kind === 'day')
				.map((row) => [`upcoming:${row.date}`, row.tasks.map((task) => task.id)])
		);
	}
	if (taskView === 'anytime') {
		return { anytime: snapshot.anytime.map((task) => task.id) };
	}
	if (taskView === 'someday') {
		return { someday: snapshot.someday.map((task) => task.id) };
	}
	return Object.fromEntries(
		snapshot.logbook.map((group) => [
			`logbook:${group.date}`,
			group.tasks.map((task) => task.id)
		])
	);
}

export function normalizePlannerDragLayout(
	layout: PlannerDragLayout,
	movingTaskIds: string[],
	sourceTaskId: string
): PlannerDragLayout {
	const movingIds = new Set(movingTaskIds);
	const sourceEntry = Object.entries(layout).find(([, taskIds]) =>
		taskIds.includes(sourceTaskId)
	);
	if (!sourceEntry || !movingIds.has(sourceTaskId)) return layout;

	const [targetListId, targetTaskIds] = sourceEntry;
	const sourceIndex = targetTaskIds.indexOf(sourceTaskId);
	const movingBeforeSource = targetTaskIds
		.slice(0, sourceIndex)
		.filter((taskId) => movingIds.has(taskId)).length;
	const uniqueMovingIds = [...new Set(movingTaskIds)];
	const nextLayout = Object.fromEntries(
		Object.entries(layout).map(([listId, taskIds]) => [
			listId,
			taskIds.filter((taskId) => !movingIds.has(taskId))
		])
	);
	const targetTasks = nextLayout[targetListId] ?? [];
	const insertionIndex = Math.max(
		0,
		Math.min(sourceIndex - movingBeforeSource, targetTasks.length)
	);
	targetTasks.splice(insertionIndex, 0, ...uniqueMovingIds);
	nextLayout[targetListId] = targetTasks;
	return nextLayout;
}

export function plannerDropDescriptorForList(listId: string): PlannerDropDescriptor | null {
	if (listId.startsWith('today:')) {
		const section = listId.slice('today:'.length);
		if (
			section === 'anytime' ||
			section === 'morning' ||
			section === 'afternoon' ||
			section === 'evening' ||
			section === 'done'
		) {
			return { type: 'planner-day-section', listId, section };
		}
	}
	if (listId === 'inbox' || listId === 'anytime' || listId === 'someday' || listId === 'review') {
		return { type: 'planner-list', listId, bucket: listId };
	}
	if (listId.startsWith('upcoming:')) {
		return {
			type: 'planner-list',
			listId,
			bucket: 'upcoming',
			date: listId.slice('upcoming:'.length)
		};
	}
	if (listId === 'logbook' || listId.startsWith('logbook:')) {
		return { type: 'planner-list', listId, bucket: 'logbook' };
	}
	if (listId.startsWith('area:')) {
		return { type: 'planner-list', listId, orderOnly: true };
	}
	return null;
}

export function projectPlannerDragLayout(
	baseTasks: Task[],
	movingTaskIds: string[],
	layout: PlannerDragLayout,
	now = new Date(),
	selectedDate = todayDateOnly(now)
) {
	const movingIds = new Set(movingTaskIds);
	const targetEntry = Object.entries(layout).find(([, taskIds]) =>
		taskIds.some((taskId) => movingIds.has(taskId))
	);
	if (!targetEntry) return baseTasks;

	const [targetListId] = targetEntry;
	const descriptor = plannerDropDescriptorForList(targetListId);
	if (!descriptor) return baseTasks;

	const orderByTaskId = new Map<string, number>();
	for (const taskIds of Object.values(layout)) {
		taskIds.forEach((taskId, index) => orderByTaskId.set(taskId, (index + 1) * 1024));
	}

	return baseTasks.map((task) => {
		let nextTask = task;
		if (movingIds.has(task.id) && !('orderOnly' in descriptor)) {
			const patch =
				descriptor.type === 'planner-day-section'
					? buildTaskPlannerDaySectionPatch(task, descriptor.section, selectedDate, now)
					: buildTaskPlannerMovePatch(
							task,
							descriptor.bucket === 'upcoming'
								? { bucket: 'upcoming', date: descriptor.date }
								: { bucket: descriptor.bucket },
							now
						);
			nextTask = applyPlannerMovePatch(task, patch);
		}
		const order = orderByTaskId.get(task.id);
		return order === undefined ? nextTask : { ...nextTask, order };
	});
}

export function orderTaskIdsByVisiblePosition(
	tasks: Task[],
	taskView: TaskBucket,
	taskArea: string | null,
	taskIds: string[],
	now = new Date(),
	selectedDate = todayDateOnly(now),
	settings: TasksPluginSettings = DEFAULT_TASKS_PLUGIN_SETTINGS
) {
	const visibleIds = visiblePlannerTasks(
		tasks,
		taskView,
		taskArea,
		now,
		selectedDate,
		settings
	).map((task) => task.id);
	const uniqueIds = [...new Set(taskIds)];
	return uniqueIds.sort(
		(left, right) => visibleIds.indexOf(left) - visibleIds.indexOf(right)
	);
}

export function resolvePlannerTaskSelection(
	visibleTaskIds: string[],
	selectedTaskIds: string[],
	anchorTaskId: string | null,
	targetTaskId: string,
	mode: PlannerSelectionMode
): PlannerTaskSelection {
	const uniqueVisibleTaskIds = [...new Set(visibleTaskIds)];
	const visibleTaskIdSet = new Set(uniqueVisibleTaskIds);
	const selectedTaskIdSet = new Set(
		selectedTaskIds.filter((taskId) => visibleTaskIdSet.has(taskId))
	);
	const orderedSelectedTaskIds = uniqueVisibleTaskIds.filter((taskId) =>
		selectedTaskIdSet.has(taskId)
	);
	const validAnchorTaskId =
		anchorTaskId && visibleTaskIdSet.has(anchorTaskId)
			? anchorTaskId
			: (orderedSelectedTaskIds[0] ?? null);

	if (!visibleTaskIdSet.has(targetTaskId)) {
		return {
			taskIds: orderedSelectedTaskIds,
			anchorTaskId: validAnchorTaskId
		};
	}

	if (mode === 'replace') {
		return {
			taskIds: [targetTaskId],
			anchorTaskId: targetTaskId
		};
	}

	if (mode === 'toggle') {
		if (selectedTaskIdSet.has(targetTaskId)) {
			selectedTaskIdSet.delete(targetTaskId);
		} else {
			selectedTaskIdSet.add(targetTaskId);
		}
		const taskIds = uniqueVisibleTaskIds.filter((taskId) =>
			selectedTaskIdSet.has(taskId)
		);
		return {
			taskIds,
			anchorTaskId:
				validAnchorTaskId && selectedTaskIdSet.has(validAnchorTaskId)
					? validAnchorTaskId
					: (taskIds[0] ?? null)
		};
	}

	const rangeAnchorTaskId = validAnchorTaskId ?? targetTaskId;
	const anchorIndex = uniqueVisibleTaskIds.indexOf(rangeAnchorTaskId);
	const targetIndex = uniqueVisibleTaskIds.indexOf(targetTaskId);
	const startIndex = Math.min(anchorIndex, targetIndex);
	const endIndex = Math.max(anchorIndex, targetIndex);
	return {
		taskIds: uniqueVisibleTaskIds.slice(startIndex, endIndex + 1),
		anchorTaskId: rangeAnchorTaskId
	};
}

export function orderedPlannerTasks(tasks: Task[]) {
	return tasks.map((task, index) => ({
		task,
		order: (index + 1) * 1024
	}));
}

function applyPlannerMovePatch(task: Task, patch: TaskPlannerMovePatch): Task {
	return {
		...task,
		...('dueAt' in patch ? { dueAt: patch.dueAt ?? undefined } : {}),
		...('scheduledAt' in patch ? { scheduledAt: patch.scheduledAt ?? undefined } : {}),
		...('when' in patch ? { when: patch.when ?? undefined } : {}),
		...('start' in patch ? { start: patch.start ?? undefined } : {}),
		...('planDate' in patch ? { planDate: patch.planDate ?? undefined } : {}),
		...('planAt' in patch ? { planAt: patch.planAt ?? undefined } : {}),
		...('deadline' in patch ? { deadline: patch.deadline ?? undefined } : {}),
		...('inbox' in patch ? { inbox: patch.inbox ?? undefined } : {}),
		...('listId' in patch ? { listId: patch.listId ?? undefined } : {}),
		...('status' in patch ? { status: patch.status ?? task.status } : {}),
		...('completedAt' in patch ? { completedAt: patch.completedAt ?? undefined } : {}),
		...('updatedAt' in patch ? { updatedAt: patch.updatedAt ?? task.updatedAt } : {}),
		...('order' in patch ? { order: patch.order } : {})
	};
}

export function changedPlannerPlacementTaskIds(before: Task[], after: Task[]) {
	const beforeById = new Map(before.map((task) => [task.id, task] as const));
	return after
		.filter((task) => {
			const previous = beforeById.get(task.id);
			return (
				!previous ||
				plannerPlacementKeys.some((key) => previous[key] !== task[key])
			);
		})
		.map((task) => task.id);
}

export function plannerPlacementsMatch(left: Task[], right: Task[]) {
	if (left.length !== right.length) return false;
	const rightById = new Map(right.map((task) => [task.id, task] as const));
	return left.every((task) => {
		const other = rightById.get(task.id);
		return (
			Boolean(other) &&
			plannerPlacementKeys.every((key) => task[key] === other?.[key])
		);
	});
}

export function buildPlannerPlacementPatch(
	task: Task,
	placement: TaskPlannerQuickPlacement
) {
	if (placement === 'this-evening') {
		return {
			...buildTaskPlannerMovePatch(task, { bucket: 'today' }),
			...resolveTaskPlannerPlacement(placement)
		};
	}
	if (
		placement === 'today' ||
		placement === 'tomorrow' ||
		placement === 'anytime' ||
		placement === 'someday'
	) {
		return {
			...resolveTaskPlannerPlacement(placement, new Date(), task),
			updatedAt: new Date().toISOString()
		};
	}
	return buildTaskPlannerMovePatch(task, { bucket: placement });
}

export function savePlannerDropPatches(
	movingTasks: Task[],
	target: TaskPlannerDropTarget,
	savePlannerMovePatch: (task: Task, patch: TaskPlannerMovePatch) => void,
	orderByTaskId?: Map<string, number>
) {
	for (const task of movingTasks) {
		const patch = buildTaskPlannerMovePatch(task, target);
		const order = orderByTaskId?.get(task.id);
		savePlannerMovePatch(task, order === undefined ? patch : { ...patch, order });
	}
}

export function getPlannerExternalDropTargetAt(
	rootElement: HTMLElement | null,
	x: number,
	y: number
): PlannerPointerDropTarget | null {
	const ownerDocument = rootElement?.ownerDocument ?? document;
	const target = ownerDocument.elementFromPoint(x, y);
	const dropElement = target?.closest('[data-planner-drop-id]');
	if (!(dropElement instanceof HTMLElement)) return null;

	const parsed = plannerDropDataFromElement(dropElement);
	if (
		!parsed ||
		(parsed.data.type !== 'planner-sidebar-bucket' &&
			parsed.data.type !== 'planner-sidebar-list')
	) {
		return null;
	}

	return {
		id: parsed.id,
		mode: parsed.mode,
		data: parsed.data
	};
}

function plannerDropDataFromElement(dropElement: HTMLElement) {
	const id = dropElement.dataset.plannerDropId;
	const mode = dropElement.dataset.plannerDropMode;
	const rawData = dropElement.dataset.plannerDropData;
	if (!id || (mode !== 'valid' && mode !== 'blocked') || !rawData) {
		return null;
	}

	try {
		const data = JSON.parse(rawData);
		if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
		return {
			id,
			mode: mode as 'valid' | 'blocked',
			data: data as Record<string, unknown>
		};
	} catch {
		return null;
	}
}
