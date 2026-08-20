<script lang="ts">
  import "./ApplicationTaskAtPicker.css";
  import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import SunIcon from "@lucide/svelte/icons/sun";
  import SunriseIcon from "@lucide/svelte/icons/sunrise";
  import * as Popover from "@lapismd/design-core/shadcn/popover";

  import {
    formatTaskPlanAtLabel,
    isTaskPlanAtDayPart,
    type TaskPlanAtDayPart,
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
    onSelect?: ((at: TaskPlanAtDayPart) => void | Promise<void>) | null;
  } = $props();

  let open = $state(false);

  const selectedAt = $derived.by((): TaskPlanAtDayPart | string => {
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

  async function select(at: TaskPlanAtDayPart) {
    await onSelect?.(at);
    closePopover();
  }
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
      role="listbox"
      aria-label="Choose planner day part"
      data-task-at-picker
      trapFocus={false}
      onFocusOutside={closePopover}
      onpointerdown={(event) => event.stopPropagation()}
    >
      <div class="task-at-picker__list">
        <button
          type="button"
          class="task-at-picker__option"
          role="option"
          aria-selected={isMorning}
          onclick={() => void select("morning")}
        >
          <span class="task-at-picker__icon task-at-picker__icon--sunrise">
            <SunriseIcon />
          </span>
          <span>Morning</span>
          {#if isMorning}
            <span class="task-at-picker__check">
              <CheckIcon />
            </span>
          {/if}
        </button>
        <button
          type="button"
          class="task-at-picker__option"
          role="option"
          aria-selected={isAfternoon}
          onclick={() => void select("afternoon")}
        >
          <span class="task-at-picker__icon task-at-picker__icon--sun">
            <SunIcon />
          </span>
          <span>Afternoon</span>
          {#if isAfternoon}
            <span class="task-at-picker__check">
              <CheckIcon />
            </span>
          {/if}
        </button>
        <button
          type="button"
          class="task-at-picker__option"
          role="option"
          aria-selected={isEvening}
          onclick={() => void select("evening")}
        >
          <span class="task-at-picker__icon task-at-picker__icon--moon">
            <MoonIcon />
          </span>
          <span>Evening</span>
          {#if isEvening}
            <span class="task-at-picker__check">
              <CheckIcon />
            </span>
          {/if}
        </button>
        <button
          type="button"
          class="task-at-picker__option"
          role="option"
          aria-selected={isAnytime}
          onclick={() => void select("anytime")}
        >
          <span class="task-at-picker__icon">
            <CalendarDaysIcon />
          </span>
          <span>Anytime</span>
          {#if isAnytime}
            <span class="task-at-picker__check">
              <CheckIcon />
            </span>
          {/if}
        </button>
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
