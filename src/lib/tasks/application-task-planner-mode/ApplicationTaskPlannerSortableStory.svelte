<script lang="ts">
	import { createTask, type Task } from '../../model';
	import ApplicationTaskPlannerMode from './ApplicationTaskPlannerMode.svelte';

	let tasks = $state(
		Array.from({ length: 36 }, (_, index) =>
			createTask({
				id: `sortable-stress-${index + 1}`,
				title: `Sortable stress task ${index + 1}`,
				status: 'todo',
				when: 'today',
				order: (index + 1) * 1024
			})
		)
	);

	function saveTask(task: Task) {
		tasks = tasks.map((entry) => (entry.id === task.id ? task : entry));
	}
</script>

<ApplicationTaskPlannerMode
	{tasks}
	view="today"
	onSaveTask={saveTask}
	onCreateTask={() => {}}
/>
