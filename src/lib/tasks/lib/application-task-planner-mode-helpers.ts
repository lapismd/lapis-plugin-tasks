import {
	buildTaskPlannerMovePatch,
	buildTaskPlannerSnapshot,
	comparePlannerTasks,
	resolveTaskPlannerPlacement,
	type Task,
	type TaskBucket,
	type TaskPlannerDropTarget,
	type TaskPlannerMovePatch
} from '../../model';

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

export function plannerTaskKey(task: Pick<Task, 'id' | 'applicationId'>) {
	return `${task.applicationId ?? 'task'}:${task.id}`;
}

export function taskProgressFor(taskList: ApplicationTask[]) {
	return {
		done: taskList.filter((task) => task.done).length,
		total: taskList.length
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
	if ('deadline' in patch) nextPatch.dueAt = patch.deadline ?? nextPatch.dueAt;
	if ('status' in patch) nextPatch.status = patch.status;
	if ('completedAt' in patch) nextPatch.completedAt = patch.completedAt ?? undefined;
	if ('order' in patch) nextPatch.order = patch.order;
	if ('updatedAt' in patch) nextPatch.updatedAt = patch.updatedAt;
	if (patch.status === 'done') nextPatch.done = true;
	if (patch.status && patch.status !== 'done') nextPatch.done = false;
	return nextPatch;
}

export function visiblePlannerTasks(
	tasks: Task[],
	taskView: TaskBucket,
	taskArea: string | null,
	now = new Date()
) {
	const snapshot = buildTaskPlannerSnapshot(tasks, now);
	if (taskArea) {
		const area = taskArea.toLowerCase();
		return tasks
			.filter((task) => task.status !== 'done' && !task.completedAt)
			.filter((task) =>
				task.areas.some(
					(taskAreaName) =>
						taskAreaName.toLowerCase() === area ||
						taskAreaName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === area
				)
			);
	}
	if (taskView === 'inbox') return snapshot.inbox;
	if (taskView === 'today') return [...snapshot.today, ...snapshot.thisEvening];
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
	now = new Date()
) {
	const snapshot = buildTaskPlannerSnapshot(tasks, now);
	if (listId === 'inbox') return snapshot.inbox;
	if (listId === 'today') return snapshot.today;
	if (listId === 'this-evening') return snapshot.thisEvening;
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
			.filter((task) => task.status !== 'done' && !task.completedAt)
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
	now = new Date()
): PlannerDragLayout {
	if (taskArea) {
		const area = taskArea.toLowerCase();
		return {
			[`area:${taskArea}`]: tasks
				.filter((task) => task.status !== 'done' && !task.completedAt)
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
		return {
			today: snapshot.today.map((task) => task.id),
			'this-evening': snapshot.thisEvening.map((task) => task.id)
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
	if (listId === 'today' || listId === 'this-evening') {
		return { type: 'planner-list', listId, bucket: 'today' };
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
	now = new Date()
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
				targetListId === 'this-evening'
					? buildPlannerPlacementPatch(task, 'this-evening')
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
	now = new Date()
) {
	const visibleIds = visiblePlannerTasks(tasks, taskView, taskArea, now).map((task) => task.id);
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
	placement: 'today' | 'this-evening' | 'anytime' | 'someday'
) {
	if (placement === 'this-evening') {
		return {
			...buildTaskPlannerMovePatch(task, { bucket: 'today' }),
			...resolveTaskPlannerPlacement('this-evening')
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
