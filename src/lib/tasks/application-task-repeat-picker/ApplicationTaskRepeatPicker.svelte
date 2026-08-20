<script lang="ts">
  import "./ApplicationTaskRepeatPicker.css";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import Repeat2Icon from "@lucide/svelte/icons/repeat-2";
  import * as CommandView from "@lapismd/design-core/shadcn/command-view";
  import * as Popover from "@lapismd/design-core/shadcn/popover";

  import type {
    TaskRepeat,
    TaskRepeatAnchor,
    TaskRepeatFrequency,
  } from "../../model";

  let {
    repeat = undefined,
    onSelect = null,
  }: {
    repeat?: TaskRepeat;
    onSelect?: ((repeat: TaskRepeat | undefined) => void | Promise<void>) | null;
  } = $props();

  let open = $state(false);
  let custom = $state(false);
  let frequency = $state<TaskRepeatFrequency>("weekly");
  let interval = $state(1);
  let anchor = $state<TaskRepeatAnchor>("schedule");
  let resetChecklist = $state(false);

  const preset = $derived.by(() => {
    if (!repeat) return "none";
    if (
      repeat.interval === 1 &&
      repeat.anchor === "schedule" &&
      !repeat.resetChecklist &&
      !repeat.on?.length
    ) {
      return repeat.frequency;
    }
    return "custom";
  });

  const label = $derived.by(() => {
    if (!repeat) return "Does not repeat";
    const unit = {
      daily: "day",
      weekly: "week",
      monthly: "month",
      yearly: "year",
    }[repeat.frequency];
    if (repeat.interval === 1) return repeat.frequency[0]!.toUpperCase() + repeat.frequency.slice(1);
    return `Every ${repeat.interval} ${unit}s`;
  });

  $effect(() => {
    if (!open) return;
    frequency = repeat?.frequency ?? "weekly";
    interval = repeat?.interval ?? 1;
    anchor = repeat?.anchor ?? "schedule";
    resetChecklist = repeat?.resetChecklist ?? false;
    custom = preset === "custom";
  });

  async function selectPreset(value: "none" | TaskRepeatFrequency) {
    if (value === "none") {
      await onSelect?.(undefined);
    } else {
      await onSelect?.({
        strategy: "rolling",
        frequency: value,
        interval: 1,
        anchor: "schedule",
        ...(repeat?.lastCompletedAt ? { lastCompletedAt: repeat.lastCompletedAt } : {}),
        ...(repeat?.completionCount != null ? { completionCount: repeat.completionCount } : {}),
      });
    }
    open = false;
  }

  async function applyCustom() {
    await onSelect?.({
      strategy: "rolling",
      frequency,
      interval: Math.max(1, Math.trunc(interval || 1)),
      anchor,
      ...(resetChecklist ? { resetChecklist: true } : {}),
      ...(repeat?.lastCompletedAt ? { lastCompletedAt: repeat.lastCompletedAt } : {}),
      ...(repeat?.completionCount != null ? { completionCount: repeat.completionCount } : {}),
    });
    open = false;
  }
</script>

<div class="task-repeat-picker" data-task-repeat-picker>
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button {...props} type="button" class="task-repeat-picker__trigger" aria-label="Set task recurrence">
          <Repeat2Icon aria-hidden="true" />
          <span>{label}</span>
          <ChevronDownIcon aria-hidden="true" />
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      class="task-repeat-picker__panel"
      style="--ui-popover-width: 22rem"
      align="start"
      sideOffset={6}
      role="dialog"
      aria-label="Choose task recurrence"
      trapFocus={false}
      onpointerdown={(event) => event.stopPropagation()}
    >
      <CommandView.Root label="Recurrence presets" loop>
        <CommandView.List aria-label="Recurrence presets">
          <CommandView.Group value="presets" heading="Presets">
            <CommandView.Item value="none" data-checked={preset === "none"} onSelect={() => void selectPreset("none")}>
              <CommandView.ItemIcon><CalendarDaysIcon aria-hidden="true" /></CommandView.ItemIcon>
              <CommandView.ItemLabel>Does not repeat</CommandView.ItemLabel>
            </CommandView.Item>
            {#each ["daily", "weekly", "monthly", "yearly"] as value (value)}
              <CommandView.Item value={value} data-checked={preset === value} onSelect={() => void selectPreset(value as TaskRepeatFrequency)}>
                <CommandView.ItemIcon><Repeat2Icon aria-hidden="true" /></CommandView.ItemIcon>
                <CommandView.ItemLabel>{value[0]!.toUpperCase() + value.slice(1)}</CommandView.ItemLabel>
              </CommandView.Item>
            {/each}
            <CommandView.Item value="custom" data-checked={preset === "custom"} onSelect={() => (custom = true)}>
              <CommandView.ItemIcon><Repeat2Icon aria-hidden="true" /></CommandView.ItemIcon>
              <CommandView.ItemLabel>Custom recurrence</CommandView.ItemLabel>
            </CommandView.Item>
          </CommandView.Group>
        </CommandView.List>
      </CommandView.Root>
      {#if custom}
        <div class="task-repeat-picker__custom" aria-label="Custom recurrence">
          <label>
            <span>Every</span>
            <input type="number" min="1" step="1" bind:value={interval} aria-label="Recurrence interval" />
          </label>
          <label>
            <span>Frequency</span>
            <select bind:value={frequency} aria-label="Recurrence frequency">
              <option value="daily">Days</option>
              <option value="weekly">Weeks</option>
              <option value="monthly">Months</option>
              <option value="yearly">Years</option>
            </select>
          </label>
          <label>
            <span>Advance from</span>
            <select bind:value={anchor} aria-label="Recurrence anchor">
              <option value="schedule">Scheduled date</option>
              <option value="completion">Completion date</option>
            </select>
          </label>
          <label class="task-repeat-picker__check">
            <input type="checkbox" bind:checked={resetChecklist} />
            <span>Reset checklist on completion</span>
          </label>
          <button type="button" class="task-repeat-picker__apply" onclick={() => void applyCustom()}>Apply recurrence</button>
        </div>
      {/if}
    </Popover.Content>
  </Popover.Root>
</div>
