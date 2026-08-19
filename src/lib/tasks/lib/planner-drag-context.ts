import type { DragDropEventHandlers } from '@dnd-kit/svelte';
import { getContext, setContext } from 'svelte';

const plannerDragContextKey = Symbol('planner-drag-controller');

export type PlannerDragController = Pick<
	DragDropEventHandlers,
	'onDragStart' | 'onDragMove' | 'onDragOver' | 'onDragEnd'
> & {
	isExternalTargetActive(): boolean;
	movingTaskCount(): number;
};

export function providePlannerDragController(controller: PlannerDragController) {
	setContext(plannerDragContextKey, controller);
	return controller;
}

export function usePlannerDragController() {
	return getContext<PlannerDragController | undefined>(plannerDragContextKey);
}
