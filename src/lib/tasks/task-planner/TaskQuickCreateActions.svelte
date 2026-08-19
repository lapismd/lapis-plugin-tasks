<script lang="ts">
  import "./TaskQuickCreateActions.css";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import CheckIcon from "@lucide/svelte/icons/check";
  import MinusIcon from "@lucide/svelte/icons/minus";
  import SignalHighIcon from "@lucide/svelte/icons/signal-high";
  import SignalLowIcon from "@lucide/svelte/icons/signal-low";
  import SignalMediumIcon from "@lucide/svelte/icons/signal-medium";
  import TagsIcon from "@lucide/svelte/icons/tags";
  import * as Popover from "@lapismd/design-core/shadcn/popover";

  import {
    resolveTaskPlannerPlacement,
    type TaskPlannerPlacement,
    type TaskPriority,
    type TaskWhen,
  } from "../../model";
  import ApplicationTaskWhenPickerContent from "../application-task-when-picker-content/ApplicationTaskWhenPickerContent.svelte";

  type QuickPlacement = Extract<
    TaskPlannerPlacement,
    "today" | "this-evening" | "anytime" | "someday"
  >;

  type ScheduleValue = {
    scheduledAt?: string;
    when?: TaskWhen;
  };

  let {
    dueAt = undefined,
    priority = undefined,
    scheduledAt = undefined,
    when = undefined,
    onDueAtChange = () => {},
    onPriorityChange = () => {},
    onScheduleChange = () => {},
    onInteractionChange = () => {},
  }: {
    dueAt?: string;
    priority?: TaskPriority;
    scheduledAt?: string;
    when?: TaskWhen;
    onDueAtChange?: (dueAt: string | undefined) => void | Promise<void>;
    onPriorityChange?: (
      priority: TaskPriority | undefined,
    ) => void | Promise<void>;
    onScheduleChange?: (value: ScheduleValue) => void | Promise<void>;
    onInteractionChange?: (open: boolean) => void;
  } = $props();

  let dueOpen = $state(false);
  let priorityOpen = $state(false);
  let whenOpen = $state(false);
  const interactionOpen = $derived(dueOpen || priorityOpen || whenOpen);

  const priorityOptions: Array<{
    value: TaskPriority | undefined;
    label: string;
    icon: typeof SignalMediumIcon;
  }> = [
    { value: undefined, label: "No priority", icon: MinusIcon },
    { value: "low", label: "Low", icon: SignalLowIcon },
    { value: "medium", label: "Medium", icon: SignalMediumIcon },
    { value: "high", label: "High", icon: SignalHighIcon },
  ];

  $effect(() => {
    onInteractionChange(interactionOpen);
  });

  async function selectDueDate(date: string) {
    dueOpen = false;
    await onDueAtChange(date);
  }

  async function clearDueDate() {
    dueOpen = false;
    await onDueAtChange(undefined);
  }

  async function selectPriority(nextPriority: TaskPriority | undefined) {
    priorityOpen = false;
    await onPriorityChange(nextPriority);
  }

  async function selectScheduleDate(date: string) {
    whenOpen = false;
    await onScheduleChange({ scheduledAt: date });
  }

  async function selectPlacement(placement: QuickPlacement) {
    whenOpen = false;
    const patch = resolveTaskPlannerPlacement(placement);
    await onScheduleChange({
      scheduledAt: patch.scheduledAt ?? undefined,
      when: patch.when ?? undefined,
    });
  }

  async function clearSchedule() {
    whenOpen = false;
    await onScheduleChange({});
  }
</script>

<div
  class="task-quick-create-actions"
  role="group"
  aria-label="New task options"
  onpointerdowncapture={() => onInteractionChange(true)}
>
  <Popover.Root bind:open={dueOpen}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          class="task-quick-create-actions__trigger"
          data-active={dueAt ? "true" : undefined}
          aria-label="Set due date"
          title="Due date"
        >
          <CalendarDaysIcon />
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      align="start"
      sideOffset={6}
      class="task-quick-create-actions__panel"
      role="dialog"
      aria-label="Choose due date"
      onpointerdown={(event) => event.stopPropagation()}
    >
      <ApplicationTaskWhenPickerContent
        mode="due"
        clearable
        scheduledAt={dueAt}
        onClear={clearDueDate}
        onSelectDate={selectDueDate}
      />
    </Popover.Content>
  </Popover.Root>

  <Popover.Root bind:open={priorityOpen}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          class="task-quick-create-actions__trigger"
          data-active={priority ? "true" : undefined}
          aria-label="Set priority"
          title="Priority"
        >
          {#if priority === "low"}
            <SignalLowIcon />
          {:else if priority === "high"}
            <SignalHighIcon />
          {:else}
            <SignalMediumIcon />
          {/if}
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      align="start"
      sideOffset={6}
      class="task-quick-create-actions__panel task-quick-create-actions__priority-panel"
      role="menu"
      aria-label="Choose priority"
      onpointerdown={(event) => event.stopPropagation()}
    >
      {#each priorityOptions as option (option.label)}
        {@const Icon = option.icon}
        <button
          type="button"
          class="task-quick-create-actions__priority-option"
          role="menuitemradio"
          aria-checked={priority === option.value}
          onclick={() => void selectPriority(option.value)}
        >
          <Icon />
          <span>{option.label}</span>
          {#if priority === option.value}
            <CheckIcon class="task-quick-create-actions__check" />
          {/if}
        </button>
      {/each}
    </Popover.Content>
  </Popover.Root>

  <Popover.Root bind:open={whenOpen}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          class="task-quick-create-actions__trigger"
          data-active={scheduledAt || when ? "true" : undefined}
          aria-label="Set when"
          title="When"
        >
          <TagsIcon />
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      align="start"
      sideOffset={6}
      class="task-quick-create-actions__panel"
      role="dialog"
      aria-label="Choose planner schedule"
      trapFocus={false}
      onFocusOutside={() => {
        whenOpen = false;
      }}
      onpointerdown={(event) => event.stopPropagation()}
    >
      <ApplicationTaskWhenPickerContent
        clearable
        {scheduledAt}
        {when}
        onClear={clearSchedule}
        onSelectDate={selectScheduleDate}
        onSelectPlacement={selectPlacement}
      />
    </Popover.Content>
  </Popover.Root>
</div>
