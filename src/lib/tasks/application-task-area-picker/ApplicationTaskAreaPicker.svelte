<script lang="ts">
	import './ApplicationTaskAreaPicker.css';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import * as CommandView from '@lapismd/design-core/shadcn/command-view';
	import * as Popover from '@lapismd/design-core/shadcn/popover';

	let {
		areas = [],
		listId = null,
		options = [],
		variant = 'footer',
		ariaLabel = 'Task list',
		onChange = () => {}
	}: {
		areas?: string[];
		listId?: string | null;
		options?: string[];
		variant?: 'chip' | 'footer';
		ariaLabel?: string;
		onChange?: (areas: string[]) => void | Promise<void>;
	} = $props();

	let open = $state(false);
	let query = $state('');
	let input = $state<HTMLInputElement | null>(null);

	const primaryArea = $derived(listId?.trim() || areas[0]?.trim() || '');
	const normalizedOptions = $derived(
		Array.from(new Set(options.map((area) => area.trim()).filter(Boolean))).sort((left, right) =>
			left.localeCompare(right)
		)
	);
	const filteredOptions = $derived.by(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return normalizedOptions;
		return normalizedOptions.filter((area) => area.toLowerCase().includes(normalizedQuery));
	});
	const customArea = $derived.by(() => {
		const next = query.trim();
		if (!next) return '';
		return normalizedOptions.some((area) => area.toLowerCase() === next.toLowerCase()) ? '' : next;
	});

	function closePicker() {
		open = false;
		query = '';
	}

	function selectArea(area: string) {
		const next = area.trim();
		void onChange(next ? [next] : []);
		closePicker();
	}

	$effect(() => {
		if (!open) return;
		query = '';
		setTimeout(() => input?.focus(), 0);
	});
</script>

<div class="application-task-area-picker" data-task-area-picker>
	<Popover.Root bind:open>
		<Popover.Trigger>
			{#snippet child({ props })}
				<button
					{...props}
					type="button"
					class="application-task-area-picker__trigger"
					class:application-task-area-picker__trigger--chip={variant === 'chip'}
					aria-label={ariaLabel}
				>
					<FolderIcon aria-hidden="true" />
					<span>{primaryArea || 'No list'}</span>
				</button>
			{/snippet}
		</Popover.Trigger>

		<Popover.Content
			class="application-task-area-picker__panel"
			align="start"
			sideOffset={6}
			role="dialog"
			aria-label="Select task list"
			data-task-area-picker
			trapFocus={false}
			onFocusOutside={closePicker}
			onpointerdown={(event) => event.stopPropagation()}
		>
			<header class="application-task-area-picker__header">
				<Popover.Title>List</Popover.Title>
				<Popover.Close>
					{#snippet child({ props })}
						<button {...props} type="button" aria-label="Close list picker">
							<XIcon aria-hidden="true" />
						</button>
					{/snippet}
				</Popover.Close>
			</header>
			<CommandView.Root
				class="application-task-area-picker__command"
				label="Search task lists"
				shouldFilter={false}
				loop
			>
				<CommandView.Input
					bind:ref={input}
					bind:value={query}
					aria-controls="application-task-area-command-list"
					placeholder="Search or create list"
				/>
				<CommandView.List
					id="application-task-area-command-list"
					class="application-task-area-picker__list"
					aria-label="Task lists"
				>
					<CommandView.Group value="areas">
						{#if !query.trim()}
							<CommandView.Item
								value="__no_area__"
								data-checked={!primaryArea}
								onSelect={() => selectArea('')}
							>
								<CommandView.ItemLabel>No list</CommandView.ItemLabel>
							</CommandView.Item>
						{/if}
						{#each filteredOptions as area (area)}
							<CommandView.Item
								value={area}
								data-checked={area === primaryArea}
								onSelect={() => selectArea(area)}
							>
								<CommandView.ItemLabel>{area}</CommandView.ItemLabel>
							</CommandView.Item>
						{/each}
						{#if customArea}
							<CommandView.Item
								value={`__create__:${customArea}`}
								onSelect={() => selectArea(customArea)}
							>
								<CommandView.ItemIcon>
									<PlusIcon aria-hidden="true" />
								</CommandView.ItemIcon>
								<CommandView.ItemLabel>Create "{customArea}"</CommandView.ItemLabel>
							</CommandView.Item>
						{/if}
					</CommandView.Group>
					<CommandView.Empty>No matching lists</CommandView.Empty>
				</CommandView.List>
			</CommandView.Root>
		</Popover.Content>
	</Popover.Root>
</div>
