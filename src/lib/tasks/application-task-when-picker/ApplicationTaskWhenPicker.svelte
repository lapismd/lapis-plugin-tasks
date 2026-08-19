<script lang="ts">
  import "./ApplicationTaskWhenPicker.css";
  import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import FlagIcon from "@lucide/svelte/icons/flag";
  import XIcon from "@lucide/svelte/icons/x";
  import * as Popover from "@lapismd/design-core/shadcn/popover";
  import type { TaskPlannerPlacement } from "../../model";

  import {
    formatShortTaskDate,
    getDueSummary,
    normalizeTaskDateOnly,
    todayDateOnly,
  } from "../../model";
  import ApplicationTaskWhenPickerContent from "../application-task-when-picker-content/ApplicationTaskWhenPickerContent.svelte";

  type QuickPlacement = Extract<
    TaskPlannerPlacement,
    "today" | "this-evening" | "anytime" | "someday"
  >;

  type PickerMode = "schedule" | "due";
  type PickerVariant = "default" | "pill" | "footer";

  let {
    clearable = true,
    mode = "schedule",
    variant = mode === "due" ? "pill" : "default",
    pickerId = `task-when-picker-${Math.random().toString(36).slice(2)}`,
    scheduledAt = null,
    when = null,
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
    onClear?: (() => void | Promise<void>) | null;
    onSelectDate?: ((date: string) => void | Promise<void>) | null;
    onSelectPlacement?: ((placement: QuickPlacement) => void | Promise<void>) | null;
  } = $props();

  let open = $state(false);

  const isDueMode = $derived(mode === "due");
  const resolvedVariant = $derived(variant);
  const normalizedScheduledAt = $derived(normalizeTaskDateOnly(scheduledAt));
  const dueSummary = $derived(getDueSummary(normalizedScheduledAt));
  const hasValue = $derived(
    isDueMode
      ? Boolean(normalizedScheduledAt)
      : Boolean(normalizedScheduledAt || when),
  );

  const scheduleLabel = $derived.by(() => {
    if (when === "this-evening") return "This Evening";
    if (when === "someday") return "Someday";
    if (when === "anytime") return "Anytime";
    if (!normalizedScheduledAt) return "Anytime";
    if (normalizedScheduledAt === todayDateOnly()) return "Today";
    return formatShortTaskDate(normalizedScheduledAt);
  });

  const pillLabel = $derived.by(() => {
    if (!normalizedScheduledAt) return "Due";
    if (dueSummary) return dueSummary.shortDate;
    return normalizedScheduledAt;
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

  async function selectPlacement(placement: QuickPlacement) {
    await onSelectPlacement?.(placement);
    closePopover();
  }

  async function clear() {
    await onClear?.();
    closePopover();
  }
</script>

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
        onClear={clear}
        onSelectDate={selectDate}
        onSelectPlacement={selectPlacement}
      />
    </Popover.Content>
  </Popover.Root>
  {#if hasValue && clearable && resolvedVariant !== "pill"}
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
