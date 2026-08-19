<script lang="ts">
	import { createSortable } from '@dnd-kit/svelte/sortable';
	import type { Snippet } from 'svelte';

	let {
		id,
		index,
		group,
		dragged = false,
		children
	}: {
		id: string;
		index: number;
		group: string;
		dragged?: boolean;
		children?: Snippet;
	} = $props();

	const sortable = createSortable({
		get id() {
			return id;
		},
		get index() {
			return index;
		},
		get group() {
			return group;
		},
		type: 'planner-task',
		accept: ['planner-task'],
		get data() {
			return {
				type: 'planner-task',
				taskId: id,
				listId: group
			};
		}
	});

	function attachSortable(node: HTMLElement) {
		const detachRow = sortable.attach(node);
		let currentHandle: HTMLElement | null = null;
		let detachHandle: (() => void) | undefined;

		function bindCurrentHandle() {
			const nextHandle = node.querySelector<HTMLElement>('[data-task-drag-handle]');
			if (nextHandle === currentHandle) return;
			detachHandle?.();
			currentHandle = nextHandle;
			detachHandle = nextHandle ? sortable.attachHandle(nextHandle) : undefined;
		}

		bindCurrentHandle();
		const observer = new MutationObserver(bindCurrentHandle);
		observer.observe(node, { childList: true, subtree: true });
		return () => {
			observer.disconnect();
			detachHandle?.();
			detachRow();
		};
	}

</script>

<div
	class="tasks-planner__sortable-row"
	class:tasks-planner__sortable-row--dragging={sortable.isDragging}
	class:tasks-planner__sortable-row--drop-target={sortable.isDropTarget}
	data-planner-sortable-row={id}
	data-planner-sortable-group={group}
	data-planner-sortable-index={index}
	data-planner-drag-source={sortable.isDragSource ? 'true' : undefined}
	data-planner-dragging={sortable.isDragging ? 'true' : undefined}
	data-planner-drag-member={dragged ? 'true' : undefined}
	{@attach attachSortable}
>
	{@render children?.()}
</div>
