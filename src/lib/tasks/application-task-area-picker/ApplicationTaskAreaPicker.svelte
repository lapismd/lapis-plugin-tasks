<script lang="ts">
	import './ApplicationTaskAreaPicker.css';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import * as Breadcrumb from '@lapismd/design-core/shadcn/breadcrumb';
	import * as CommandView from '@lapismd/design-core/shadcn/command-view';
	import * as Popover from '@lapismd/design-core/shadcn/popover';
	import { formatTaskListIdTitle, listsMatch } from '../../model';
	import type {
		TaskListPickerOption,
		TaskListPickerOptionInput
	} from './types';

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
		options?: TaskListPickerOptionInput[];
		variant?: 'chip' | 'footer';
		ariaLabel?: string;
		onChange?: (areas: string[]) => void | Promise<void>;
	} = $props();

	let open = $state(false);
	let query = $state('');
	let input = $state<HTMLInputElement | null>(null);

	type NormalizedTaskListPickerOption = TaskListPickerOption & {
		key: string;
		searchText: string;
	};

	function normalizePickerOption(
		option: TaskListPickerOptionInput
	): NormalizedTaskListPickerOption | null {
		const raw = typeof option === 'string' ? { title: option } : option;
		const title = raw.title.trim();
		if (!title) return null;
		const id = raw.id?.trim() || undefined;
		const path = raw.path?.trim() || undefined;
		const breadcrumb = raw.breadcrumb
			?.map((segment) => segment.trim())
			.filter(Boolean);
		return {
			...raw,
			id,
			title,
			path,
			breadcrumb,
			key: id ?? path ?? title,
			searchText: [title, id, path, ...(breadcrumb ?? [])]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
		};
	}

	function optionMatchesValue(
		option: NormalizedTaskListPickerOption,
		value: string | null | undefined
	) {
		const needle = value?.trim();
		if (!needle) return false;
		return listsMatch(
			{
				id: option.id ?? option.title,
				title: option.title,
				path: option.path
			},
			needle
		);
	}

	const normalizedOptions = $derived.by(() => {
		const seen = new Set<string>();
		return options
			.map(normalizePickerOption)
			.filter((option): option is NormalizedTaskListPickerOption => Boolean(option))
			.filter((option) => {
				const key = option.key.toLowerCase();
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			})
			.sort((left, right) => left.title.localeCompare(right.title));
	});
	const selectedOption = $derived.by(() => {
		const area = areas[0]?.trim();
		const id = listId?.trim();
		return (
			normalizedOptions.find(
				(option) =>
					optionMatchesValue(option, id) || optionMatchesValue(option, area)
			) ?? null
		);
	});
	const primaryArea = $derived.by(() => {
		const area = areas[0]?.trim();
		const id = listId?.trim();
		if (selectedOption) return selectedOption.title;
		if (area && area !== id) return area;
		return formatTaskListIdTitle(id ?? area) ?? '';
	});
	const filteredOptions = $derived.by(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return normalizedOptions;
		return normalizedOptions.filter((option) =>
			option.searchText.includes(normalizedQuery)
		);
	});
	const customArea = $derived.by(() => {
		const next = query.trim();
		if (!next) return '';
		const needle = next.toLowerCase();
		return normalizedOptions.some(
			(option) =>
				option.title.toLowerCase() === needle ||
				option.id?.toLowerCase() === needle ||
				option.path?.toLowerCase() === needle
		)
			? ''
			: next;
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
			style="--ui-popover-width: min(24rem, calc(100vw - 2rem))"
			align="start"
			sideOffset={6}
			role="dialog"
			aria-label="Select task list"
			data-task-area-picker
			trapFocus={false}
			onFocusOutside={closePicker}
			onpointerdown={(event) => event.stopPropagation()}
		>
			<CommandView.Root
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
						{#each filteredOptions as option (option.key)}
							<CommandView.Item
								value={option.key}
								data-checked={option === selectedOption}
								onSelect={() => selectArea(option.title)}
							>
								<CommandView.ItemIcon>
									<FolderIcon aria-hidden="true" />
								</CommandView.ItemIcon>
								<CommandView.ItemLabel>{option.title}</CommandView.ItemLabel>
								{#if option.path || option.breadcrumb?.length}
									<div class="application-task-area-picker__option-meta">
										{#if option.path}
											<span class="application-task-area-picker__option-path">
												{option.path}
											</span>
										{/if}
										{#if option.breadcrumb?.length}
											<div
												class="application-task-area-picker__breadcrumb-shell"
												role="group"
												aria-label={`List breadcrumb for ${option.title}`}
											>
												<Breadcrumb.Root class="application-task-area-picker__breadcrumb">
													<Breadcrumb.List>
														{#each option.breadcrumb as segment, index}
															<Breadcrumb.Item>
																<Breadcrumb.Page>{segment}</Breadcrumb.Page>
															</Breadcrumb.Item>
															{#if index < (option.breadcrumb?.length ?? 0) - 1}
																<Breadcrumb.Separator />
															{/if}
														{/each}
													</Breadcrumb.List>
												</Breadcrumb.Root>
											</div>
										{/if}
									</div>
								{/if}
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
