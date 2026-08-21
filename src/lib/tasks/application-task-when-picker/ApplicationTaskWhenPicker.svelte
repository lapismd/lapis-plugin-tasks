<script lang="ts">
  import "./ApplicationTaskWhenPicker.css";
  import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import FlagIcon from "@lucide/svelte/icons/flag";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import SunIcon from "@lucide/svelte/icons/sun";
  import SunriseIcon from "@lucide/svelte/icons/sunrise";
  import XIcon from "@lucide/svelte/icons/x";
  import * as Popover from "@lapismd/design-core/shadcn/popover";
  import * as Tooltip from "@lapismd/design-core/shadcn/tooltip";
  import type { TaskPlannerQuickPlacement } from "../../model";

  import {
    formatTaskScheduleLabel,
    formatTaskPlanAtLabel,
    getDueSummary,
    normalizeTaskDateOnly,
  } from "../../model";
  import ApplicationTaskWhenPickerContent from "../application-task-when-picker-content/ApplicationTaskWhenPickerContent.svelte";

  type PickerMode = "schedule" | "due";
  type PickerVariant = "default" | "pill" | "footer" | "chip";

  let {
    clearable = true,
    mode = "schedule",
    variant = mode === "due" ? "pill" : "default",
    pickerId = `task-when-picker-${Math.random().toString(36).slice(2)}`,
    scheduledAt = null,
    when = null,
    planAt = null,
    now = undefined,
    onClear = null,
    onSelectDate = null,
    onSelectPlacement = null,
  }: {
    clearable?: boolean;
    mode?: PickerMode;
    variant?: PickerVariant;
    pickerId?: string;
    scheduledAt?: string | null;
    when?: string | null;
    planAt?: string | null;
    now?: Date;
    onClear?: (() => void | Promise<void>) | null;
    onSelectDate?: ((date: string) => void | Promise<void>) | null;
    onSelectPlacement?: ((placement: TaskPlannerQuickPlacement) => void | Promise<void>) | null;
  } = $props();

  let open = $state(false);

  const isDueMode = $derived(mode === "due");
  const resolvedVariant = $derived(variant);
  const normalizedScheduledAt = $derived(normalizeTaskDateOnly(scheduledAt));
  const referenceNow = $derived(now ?? new Date());
  const dueSummary = $derived(getDueSummary(normalizedScheduledAt, referenceNow));
  const hasValue = $derived(
    isDueMode
      ? Boolean(normalizedScheduledAt)
      : Boolean(normalizedScheduledAt || when || planAt),
  );

  const scheduleLabel = $derived(
    formatTaskScheduleLabel({ when, planAt, scheduledAt, now }) ?? "Anytime",
  );

  const scheduleChipDateLabel = $derived.by(() => {
    if (dueSummary?.tone === "overdue") return dueSummary.distance;
    return (
      formatTaskScheduleLabel({ when, planAt, scheduledAt, now }) ?? "Anytime"
    );
  });
  const scheduleChipTimeLabel = $derived(
    formatTaskPlanAtLabel({ when, planAt }),
  );
  const scheduleChipShowsTime = $derived(
    scheduleChipTimeLabel !== "Anytime",
  );

  const pillLabel = $derived.by(() => {
    if (!normalizedScheduledAt) return "Due";
    if (dueSummary) return dueSummary.shortDate;
    return normalizedScheduledAt;
  });
  const dueChipLabel = $derived.by(() => {
    if (!normalizedScheduledAt) return "Due";
    if (dueSummary?.tone === "overdue") return dueSummary.distance;
    if (dueSummary) return dueSummary.shortDate;
    return normalizedScheduledAt;
  });
  const chipTooltipLabel = $derived.by(() => {
    if (dueSummary?.tone !== "overdue") return null;
    return isDueMode
      ? `Due ${dueSummary.fullDate}`
      : `Scheduled ${dueSummary.fullDate}`;
  });

  const triggerAriaLabel = $derived(
    isDueMode ? "Set due date" : "Set planner schedule",
  );
  const panelAriaLabel = $derived(
    isDueMode ? "Choose due date" : "Choose planner schedule",
  );
  const clearAriaLabel = $derived(
    isDueMode ? "Clear due date" : "Clear planner schedule",
  );

  function closePopover() {
    open = false;
  }

  async function selectDate(date: string) {
    await onSelectDate?.(date);
    closePopover();
  }

  async function selectPlacement(placement: TaskPlannerQuickPlacement) {
    await onSelectPlacement?.(placement);
    closePopover();
  }

  async function clear() {
    await onClear?.();
    closePopover();
  }
</script>

{#snippet scheduleChipContent()}
  {#if scheduleChipShowsTime}
    <span class="task-when-picker__chip-date">{scheduleChipDateLabel}</span>
    <span class="task-when-picker__chip-separator" aria-hidden="true">·</span>
    <span class="task-when-picker__chip-time">
      {#if scheduleChipTimeLabel === "Morning"}
        <SunriseIcon />
      {:else if scheduleChipTimeLabel === "Afternoon"}
        <SunIcon />
      {:else if scheduleChipTimeLabel === "Evening"}
        <MoonIcon />
      {:else}
        <CalendarClockIcon />
      {/if}
      <span>{scheduleChipTimeLabel}</span>
    </span>
  {:else}
    <CalendarClockIcon />
    <span>{scheduleChipDateLabel}</span>
  {/if}
{/snippet}

{#snippet dueChipContent()}
  <FlagIcon />
  <span>{dueChipLabel}</span>
{/snippet}

<div
  class="task-when-picker"
  class:task-when-picker--footer={resolvedVariant === "footer"}
  data-task-when-picker
  data-task-due-picker={isDueMode ? "" : undefined}
  data-mode={mode}
  data-variant={resolvedVariant}
>
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({ props })}
        {#if resolvedVariant === "footer"}
          <button
            {...props}
            type="button"
            class="task-when-picker__trigger task-when-picker__trigger--footer"
            class:task-when-picker__trigger--empty={!hasValue}
            class:task-when-picker__trigger--overdue={dueSummary?.tone === "overdue"}
            class:task-when-picker__trigger--today={dueSummary?.tone === "today"}
            aria-label={triggerAriaLabel}
          >
            <FlagIcon />
            {#if dueSummary}
              <span class="task-when-picker__footer-date">{dueSummary.shortDate}</span>
              <span class="task-when-picker__footer-distance">
                {dueSummary.distance}
              </span>
            {:else}
              <span>Deadline</span>
            {/if}
          </button>
        {:else if resolvedVariant === "pill"}
          <button
            {...props}
            type="button"
            class="task-when-picker__trigger task-when-picker__trigger--pill"
            aria-label={triggerAriaLabel}
          >
            <CalendarDaysIcon />
            <span>{pillLabel}</span>
            <ChevronDownIcon />
          </button>
        {:else if resolvedVariant === "chip"}
          {#if chipTooltipLabel}
            <Tooltip.Provider delayDuration={250}>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  {#snippet child({ props: tooltipProps })}
                    <span
                      {...tooltipProps}
                      class="task-when-picker__tooltip-anchor"
                    >
                      <button
                        {...props}
                        type="button"
                        class="task-when-picker__trigger task-when-picker__trigger--chip"
                        class:task-when-picker__trigger--overdue={dueSummary?.tone === "overdue"}
                        class:task-when-picker__trigger--today={dueSummary?.tone === "today"}
                        aria-label={triggerAriaLabel}
                      >
                        {#if isDueMode}
                          {@render dueChipContent()}
                        {:else}
                          {@render scheduleChipContent()}
                        {/if}
                        <ChevronDownIcon />
                      </button>
                    </span>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content sideOffset={6} class="task-when-picker__tooltip">
                  {chipTooltipLabel}
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          {:else}
            <button
              {...props}
              type="button"
              class="task-when-picker__trigger task-when-picker__trigger--chip"
              class:task-when-picker__trigger--overdue={dueSummary?.tone === "overdue"}
              class:task-when-picker__trigger--today={dueSummary?.tone === "today"}
              aria-label={triggerAriaLabel}
            >
              {#if isDueMode}
                {@render dueChipContent()}
              {:else}
                {@render scheduleChipContent()}
              {/if}
              <ChevronDownIcon />
            </button>
          {/if}
        {:else}
          <button
            {...props}
            type="button"
            class="task-when-picker__trigger task-when-picker__trigger--default"
            class:task-when-picker__trigger--empty={!hasValue}
            aria-label={triggerAriaLabel}
          >
            <CalendarClockIcon />
            <span>{scheduleLabel}</span>
            <ChevronDownIcon />
          </button>
        {/if}
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      id={pickerId}
      align="start"
      sideOffset={6}
      class="task-when-picker__panel"
      role="dialog"
      aria-label={panelAriaLabel}
      data-task-when-picker
      data-task-due-picker={isDueMode ? "" : undefined}
      data-mode={mode}
      trapFocus={false}
      onFocusOutside={closePopover}
      onpointerdown={(event) => event.stopPropagation()}
    >
      <ApplicationTaskWhenPickerContent
        {clearable}
        {mode}
        {scheduledAt}
        {when}
        {planAt}
        {now}
        onClear={clear}
        onSelectDate={selectDate}
        onSelectPlacement={selectPlacement}
      />
    </Popover.Content>
  </Popover.Root>
  {#if hasValue && clearable && resolvedVariant !== "pill" && resolvedVariant !== "chip"}
    <button
      type="button"
      class={resolvedVariant === "footer"
        ? "task-when-picker__footer-clear"
        : "task-when-picker__clear"}
      aria-label={clearAriaLabel}
      onclick={() => void clear()}
    >
      <XIcon />
    </button>
  {/if}
</div>
