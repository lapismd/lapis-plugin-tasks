import { describe, expect, it } from 'vitest';

import { buildTaskPlannerSnapshot, createTask, type Task } from '../../model';
import {
	buildPlannerDragLayout,
	changedPlannerPlacementTaskIds,
	normalizePlannerDragLayout,
	plannerPlacementsMatch,
	projectPlannerDragLayout,
	resolvePlannerTaskSelection,
	type PlannerDragLayout
} from './application-task-planner-mode-helpers';

const now = new Date('2026-07-28T12:00:00.000Z');

function plannerTask(id: string, order: number, patch: Partial<Task> = {}) {
	return createTask({
		id,
		title: `Task ${id}`,
		status: 'todo',
		when: 'today',
		order,
		...patch
	});
}

function todayIds(tasks: Task[]) {
	return buildTaskPlannerSnapshot(tasks, now).today.map((task) => task.id);
}

describe('planner Task selection', () => {
	const visibleTaskIds = ['first', 'second', 'third', 'fourth'];

	it('replaces selection and establishes an anchor for a plain click', () => {
		expect(
			resolvePlannerTaskSelection(visibleTaskIds, ['first', 'second'], 'first', 'third', 'replace')
		).toEqual({
			taskIds: ['third'],
			anchorTaskId: 'third'
		});
	});

	it('toggles one Task while retaining or recovering the anchor', () => {
		const added = resolvePlannerTaskSelection(
			visibleTaskIds,
			['first'],
			'first',
			'third',
			'toggle'
		);
		expect(added).toEqual({
			taskIds: ['first', 'third'],
			anchorTaskId: 'first'
		});
		expect(
			resolvePlannerTaskSelection(
				visibleTaskIds,
				added.taskIds,
				added.anchorTaskId,
				'first',
				'toggle'
			)
		).toEqual({
			taskIds: ['third'],
			anchorTaskId: 'third'
		});
		expect(resolvePlannerTaskSelection(visibleTaskIds, ['first'], 'first', 'first', 'toggle')).toEqual({
			taskIds: [],
			anchorTaskId: null
		});
	});

	it('selects inclusive forward and reverse ranges from the anchor', () => {
		expect(
			resolvePlannerTaskSelection(visibleTaskIds, ['second'], 'second', 'fourth', 'range')
		).toEqual({
			taskIds: ['second', 'third', 'fourth'],
			anchorTaskId: 'second'
		});
		expect(
			resolvePlannerTaskSelection(visibleTaskIds, ['fourth'], 'fourth', 'first', 'range')
		).toEqual({
			taskIds: visibleTaskIds,
			anchorTaskId: 'fourth'
		});
	});

	it('uses the first visible selected Task when the anchor is unavailable', () => {
		expect(
			resolvePlannerTaskSelection(
				visibleTaskIds,
				['hidden', 'second'],
				'hidden',
				'fourth',
				'range'
			)
		).toEqual({
			taskIds: ['second', 'third', 'fourth'],
			anchorTaskId: 'second'
		});
	});
});

describe('planner drag layouts', () => {
	it('builds stable groups, including empty planner lists', () => {
		const layout = buildPlannerDragLayout(
			[
				plannerTask('morning', 1024, { planAt: 'morning' }),
				plannerTask('evening', 2048, { when: 'this-evening' })
			],
			'today',
			null,
			now
		);

		expect(layout).toEqual({
			'today:anytime': [],
			'today:morning': ['morning'],
			'today:afternoon': [],
			'today:evening': ['evening'],
			'today:done': []
		});
		expect(buildPlannerDragLayout([plannerTask('morning', 1024)], 'today', null, now)).toEqual({
			'today:anytime': ['morning'],
			'today:morning': [],
			'today:afternoon': [],
			'today:evening': [],
			'today:done': []
		});
	});

	it.each([
		{
			label: 'moves downward to the final endpoint',
			moved: { today: ['second', 'third', 'first'] },
			expected: ['second', 'third', 'first']
		},
		{
			label: 'moves upward to the first endpoint',
			moved: { today: ['third', 'first', 'second'] },
			expected: ['third', 'first', 'second']
		}
	])('$label', ({ moved, expected }) => {
		const normalized = normalizePlannerDragLayout(moved, [moved.today[2] ?? ''], moved.today[2] ?? '');
		expect(normalized.today).toEqual(expected);
	});

	it('normalizes a selected block without duplicates', () => {
		const movedByDndKit: PlannerDragLayout = {
			today: ['first', 'third', 'fourth', 'second']
		};
		const normalized = normalizePlannerDragLayout(
			movedByDndKit,
			['second', 'third', 'second'],
			'second'
		);

		expect(normalized.today).toEqual(['first', 'fourth', 'second', 'third']);
		expect(new Set(normalized.today).size).toBe(normalized.today.length);
	});

	it('moves a selected block into an empty group', () => {
		const normalized = normalizePlannerDragLayout(
			{
				today: ['first'],
				'this-evening': ['second']
			},
			['second', 'third'],
			'second'
		);

		expect(normalized).toEqual({
			today: ['first'],
			'this-evening': ['second', 'third']
		});
	});
});

describe('projectPlannerDragLayout', () => {
	it('projects from the immutable base collection after each layout move', () => {
		const tasks = [
			plannerTask('first', 1024),
			plannerTask('second', 2048),
			plannerTask('third', 3072)
		];
		const finalLayout = { 'today:anytime': ['second', 'third', 'first'] };
		const projected = projectPlannerDragLayout(tasks, ['first'], finalLayout, now);
		const replayed = projectPlannerDragLayout(tasks, ['first'], finalLayout, now);

		expect(todayIds(projected)).toEqual(['second', 'third', 'first']);
		expect(projected).toEqual(replayed);
		expect(projected.map((task) => task.order)).toEqual([3072, 1024, 2048]);
		expect(changedPlannerPlacementTaskIds(tasks, projected)).toEqual([
			'first',
			'second',
			'third'
		]);
	});

	it('projects placement and ordering across planner groups', () => {
		const tasks = [
			plannerTask('first', 1024),
			plannerTask('second', 2048),
			plannerTask('scheduled', 1024, {
				when: undefined,
				scheduledAt: '2026-07-30'
			})
		];
		const layout = {
			'today:anytime': ['first'],
			'upcoming:2026-07-30': ['scheduled', 'second']
		};
		const projected = projectPlannerDragLayout(tasks, ['second'], layout, now);
		const moved = projected.find((task) => task.id === 'second');

		expect(moved?.scheduledAt).toBe('2026-07-30');
		expect(moved?.when).toBeUndefined();
		expect(moved?.order).toBe(2048);
	});

	it('changes order only while sorting an area', () => {
		const tasks = [
			plannerTask('first', 1024, { areas: ['Work'] }),
			plannerTask('second', 2048, { areas: ['Work'] })
		];
		const projected = projectPlannerDragLayout(
			tasks,
			['first'],
			{ 'area:work': ['second', 'first'] },
			now
		);
		const moved = projected.find((task) => task.id === 'first');

		expect(moved?.when).toBe('today');
		expect(moved?.scheduledAt).toBeUndefined();
		expect(moved?.order).toBe(2048);
	});

	it('returns the immutable snapshot when a drag is canceled before a target resolves', () => {
		const tasks = [plannerTask('first', 1024), plannerTask('second', 2048)];
		expect(projectPlannerDragLayout(tasks, ['first'], { 'today:anytime': ['second'] }, now)).toBe(tasks);
	});

	it('moves between daily sections and completes or reopens with the selected date', () => {
		const tasks = [
			plannerTask('open', 1024, { planDate: '2026-07-28', planAt: 'morning' }),
			plannerTask('done', 1024, {
				status: 'completed',
				completedAt: '2026-07-28T08:00:00.000Z'
			})
		];
		const movedToDone = projectPlannerDragLayout(
			tasks,
			['open'],
			{
				'today:morning': [],
				'today:done': ['done', 'open']
			},
			now,
			'2026-07-28'
		);
		expect(movedToDone.find((task) => task.id === 'open')).toMatchObject({
			status: 'completed',
			completedAt: now.toISOString(),
			order: 2048
		});

		const reopened = projectPlannerDragLayout(
			tasks,
			['done'],
			{
				'today:afternoon': ['done'],
				'today:done': []
			},
			now,
			'2026-07-30'
		);
		expect(reopened.find((task) => task.id === 'done')).toMatchObject({
			status: 'open',
			completedAt: undefined,
			planDate: '2026-07-30',
			planAt: 'afternoon'
		});
	});

	it('compares only persisted placement fields for optimistic reconciliation', () => {
		const tasks = [plannerTask('first', 1024)];
		const renamed = [{ ...tasks[0]!, title: 'Renamed elsewhere' }];
		const reordered = [{ ...tasks[0]!, order: 2048 }];

		expect(plannerPlacementsMatch(tasks, renamed)).toBe(true);
		expect(plannerPlacementsMatch(tasks, reordered)).toBe(false);
	});
});
