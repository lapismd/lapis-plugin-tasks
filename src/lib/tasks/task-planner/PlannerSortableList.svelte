<script lang="ts">
	import { createDroppable } from '@dnd-kit/svelte';
	import type { Snippet } from 'svelte';

	let {
		id,
		label,
		children
	}: {
		id: string;
		label: string;
		children?: Snippet;
	} = $props();

	const droppable = createDroppable({
		get id() {
			return id;
		},
		type: 'planner-list',
		accept: ['planner-task'],
		collisionPriority: 1,
		get data() {
			return {
				type: 'planner-list',
				listId: id
			};
		}
	});
</script>

<div
	class="tasks-planner__list"
	class:tasks-planner__list--drop-target={droppable.isDropTarget}
	data-planner-sortable-list={id}
	role="group"
	aria-label={label}
	{@attach droppable.attach}
>
	{@render children?.()}
</div>
