<script lang="ts">
	import ApplicationTaskAreaPicker from '../application-task-area-picker/ApplicationTaskAreaPicker.svelte';

	let {
		value = [],
		update,
		options = [],
		ariaLabel = 'Task list'
	}: {
		value?: string[];
		update: (areas: string[]) => void | Promise<void>;
		options?: string[];
		ariaLabel?: string;
	} = $props();
</script>

<ApplicationTaskAreaPicker
	areas={value}
	{options}
	{ariaLabel}
	onChange={(areas) => void update(areas)}
/>

