<script lang="ts">
	import ApplicationTaskAreaPicker from '../application-task-area-picker/ApplicationTaskAreaPicker.svelte';
	import type { TaskListPickerOptionInput } from '../application-task-area-picker';

	let {
		value = [],
		update,
		options = [],
		ariaLabel = 'Task list'
	}: {
		value?: string[];
		update: (areas: string[]) => void | Promise<void>;
		options?: TaskListPickerOptionInput[];
		ariaLabel?: string;
	} = $props();
</script>

<ApplicationTaskAreaPicker
	areas={value}
	{options}
	{ariaLabel}
	onChange={(areas) => void update(areas)}
/>
