<script lang="ts">
  import "./ApplicationTaskAtPicker.css";
  import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import Clock3Icon from "@lucide/svelte/icons/clock-3";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import SunIcon from "@lucide/svelte/icons/sun";
  import SunriseIcon from "@lucide/svelte/icons/sunrise";
  import { TimePicker } from "@lapismd/design-core/forms";
  import * as CommandView from "@lapismd/design-core/shadcn/command-view";
  import * as Popover from "@lapismd/design-core/shadcn/popover";

  import {
    formatTaskPlanAtLabel,
    isTaskPlanAtDayPart,
  } from "../../model";

  let {
    pickerId = `task-at-picker-${Math.random().toString(36).slice(2)}`,
    when = null,
    planAt = null,
    onSelect = null,
  }: {
    pickerId?: string;
    when?: string | null;
    planAt?: string | null;
    onSelect?: ((at: string) => void | Promise<void>) | null;
  } = $props();

  let open = $state(false);
  let timeDraft = $state<string | undefined>(undefined);

  const selectedAt = $derived.by((): string => {
    if (when === "this-evening" || planAt === "evening") return "evening";
    if (isTaskPlanAtDayPart(planAt)) return planAt;
    if (planAt && /^\d{2}:\d{2}$/.test(planAt)) return planAt;
    return "anytime";
  });
  const selectedLabel = $derived(formatTaskPlanAtLabel({ when, planAt }));
  const isMorning = $derived(selectedAt === "morning");
  const isAfternoon = $derived(selectedAt === "afternoon");
  const isEvening = $derived(selectedAt === "evening");
  const isAnytime = $derived(selectedAt === "anytime");
  const isClock = $derived(!isMorning && !isAfternoon && !isEvening && !isAnytime);

  function closePopover() {
    open = false;
  }

  async function select(at: string) {
    await onSelect?.(at);
    closePopover();
  }

  $effect(() => {
    if (!open) return;
    timeDraft = /^\d{2}:\d{2}$/.test(planAt ?? "")
      ? (planAt ?? undefined)
      : undefined;
  });
</script>

<div class="task-at-picker" data-task-at-picker>
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          class="task-at-picker__trigger"
          aria-label="Set planner day part"
        >
          <span
            class="task-at-picker__icon"
            class:task-at-picker__icon--sunrise={isMorning}
            class:task-at-picker__icon--sun={isAfternoon}
            class:task-at-picker__icon--moon={isEvening}
          >
            {#if isMorning}
              <SunriseIcon />
            {:else if isAfternoon}
              <SunIcon />
            {:else if isEvening}
              <MoonIcon />
            {:else if isClock}
              <CalendarClockIcon />
            {:else}
              <CalendarDaysIcon />
            {/if}
          </span>
          <span>{selectedLabel}</span>
          <ChevronDownIcon />
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      id={pickerId}
      align="start"
      sideOffset={6}
      class="task-at-picker__panel"
      role="dialog"
      aria-label="Choose planner day part"
      data-task-at-picker
      trapFocus={false}
      onFocusOutside={closePopover}
      onpointerdown={(event) => event.stopPropagation()}
    >
      <CommandView.Root label="Choose planner time" loop>
        <CommandView.List aria-label="Planner time shortcuts">
          <CommandView.Group value="day-parts" heading="Day parts">
            <CommandView.Item value="morning" data-checked={isMorning} onSelect={() => void select("morning")}>
              <CommandView.ItemIcon><SunriseIcon aria-hidden="true" /></CommandView.ItemIcon>
              <CommandView.ItemLabel>Morning</CommandView.ItemLabel>
            </CommandView.Item>
            <CommandView.Item value="afternoon" data-checked={isAfternoon} onSelect={() => void select("afternoon")}>
              <CommandView.ItemIcon><SunIcon aria-hidden="true" /></CommandView.ItemIcon>
              <CommandView.ItemLabel>Afternoon</CommandView.ItemLabel>
            </CommandView.Item>
            <CommandView.Item value="evening" data-checked={isEvening} onSelect={() => void select("evening")}>
              <CommandView.ItemIcon><MoonIcon aria-hidden="true" /></CommandView.ItemIcon>
              <CommandView.ItemLabel>Evening</CommandView.ItemLabel>
            </CommandView.Item>
            <CommandView.Item value="anytime" data-checked={isAnytime} onSelect={() => void select("anytime")}>
              <CommandView.ItemIcon><CalendarDaysIcon aria-hidden="true" /></CommandView.ItemIcon>
              <CommandView.ItemLabel>Anytime</CommandView.ItemLabel>
            </CommandView.Item>
          </CommandView.Group>
          <CommandView.Group value="shortcuts" heading="Shortcuts">
            {#each ["09:00", "12:00", "17:00"] as time (time)}
              <CommandView.Item value={time} data-checked={selectedAt === time} onSelect={() => void select(time)}>
                <CommandView.ItemIcon><Clock3Icon aria-hidden="true" /></CommandView.ItemIcon>
                <CommandView.ItemLabel>{time}</CommandView.ItemLabel>
              </CommandView.Item>
            {/each}
          </CommandView.Group>
        </CommandView.List>
      </CommandView.Root>
      <div class="task-at-picker__custom">
        <span>Custom time</span>
        <div>
          <TimePicker bind:value={timeDraft} ariaLabel="Custom planner time" clearable={false} />
          <button type="button" disabled={!timeDraft} onclick={() => timeDraft && void select(timeDraft)}>Apply</button>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
