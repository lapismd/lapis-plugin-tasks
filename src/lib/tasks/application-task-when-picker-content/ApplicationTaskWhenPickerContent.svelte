<script lang="ts">
  import "./ApplicationTaskWhenPickerContent.css";
  import ArchiveIcon from "@lucide/svelte/icons/archive";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import CheckIcon from "@lucide/svelte/icons/check";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import StarIcon from "@lucide/svelte/icons/star";
  import * as Command from "@lapismd/design-core/shadcn/command";
  import { parseDate } from "chrono-node";
  import type { DateValue } from "@internationalized/date";
  import { TaskDueCalendar } from "@lapismd/design-core/forms";
  import type { TaskPlannerPlacement } from "../../model";

  import {
    buildNaturalDateSuggestions,
    calendarDateFromDate,
    calendarDateFromTaskValue,
    normalizeTaskDateOnly,
    taskDateFromCalendarDate,
    todayDateOnly,
    type TaskDateSuggestion,
  } from "../../model";

  type QuickPlacement = Extract<
    TaskPlannerPlacement,
    "today" | "this-evening" | "anytime" | "someday"
  >;

  type PickerMode = "schedule" | "due";

  let {
    clearable = true,
    mode = "schedule",
    onClear = null,
    onSelectDate = null,
    onSelectPlacement = null,
    scheduledAt = null,
    when = null,
  }: {
    clearable?: boolean;
    mode?: PickerMode;
    onClear?: (() => void | Promise<void>) | null;
    onSelectDate?: ((date: string) => void | Promise<void>) | null;
    onSelectPlacement?: ((placement: QuickPlacement) => void | Promise<void>) | null;
    scheduledAt?: string | null;
    when?: string | null;
  } = $props();

  let inputValue = $state("");
  let selectedDate = $state<DateValue | undefined>();
  let syncedValue = $state<string | null | undefined>(undefined);

  $effect(() => {
    if (scheduledAt === syncedValue) return;
    syncedValue = scheduledAt;
    selectedDate = calendarDateFromTaskValue(scheduledAt);
    inputValue = "";
  });

  const naturalQuery = $derived(inputValue.trim());
  const naturalSuggestions = $derived.by(() =>
    buildNaturalDateSuggestions(naturalQuery),
  );
  const normalizedScheduledAt = $derived(normalizeTaskDateOnly(scheduledAt));
  const today = $derived(todayDateOnly());
  const isDueMode = $derived(mode === "due");
  const commandLabel = $derived(isDueMode ? "Due date" : "Schedule");
  const suggestionsLabel = $derived(
    isDueMode ? "Due date suggestions" : "Schedule suggestions",
  );
  const suggestionsId = $derived(
    isDueMode ? "task-due-picker-suggestions" : "task-when-picker-suggestions",
  );
  const isTodaySelected = $derived(
    isDueMode
      ? normalizedScheduledAt === today
      : normalizedScheduledAt === today && when !== "this-evening",
  );

  function updateNaturalDate(nextValue: string) {
    inputValue = nextValue;
    const parsed = parseDate(nextValue);
    if (parsed) selectedDate = calendarDateFromDate(parsed);
  }

  async function applySuggestion(suggestion: TaskDateSuggestion) {
    await onSelectDate?.(suggestion.date);
  }

  async function applyPlacement(placement: QuickPlacement) {
    if (isDueMode) {
      if (placement === "today") await onSelectDate?.(todayDateOnly());
      return;
    }
    await onSelectPlacement?.(placement);
  }

  async function applyToday() {
    if (isDueMode) {
      await onSelectDate?.(todayDateOnly());
      return;
    }
    await onSelectPlacement?.("today");
  }

  async function clearSchedule() {
    await onClear?.();
  }
</script>

<div class="task-when-picker-content" data-mode={mode}>
  <Command.Root
    class="task-when-picker-content__command"
    label={commandLabel}
    shouldFilter={false}
    loop
  >
    <Command.Input
      bind:value={inputValue}
      placeholder="When"
      oninput={(event) => updateNaturalDate(event.currentTarget.value)}
      aria-controls={suggestionsId}
    />
    <Command.List
      id={suggestionsId}
      class="task-when-picker-content__suggestions"
      aria-label={suggestionsLabel}
    >
      {#if naturalQuery}
        {#if naturalSuggestions.length}
          <Command.Group value="dates">
            {#each naturalSuggestions as suggestion (suggestion.id)}
              <Command.Item
                value={suggestion.id}
                keywords={[suggestion.label, suggestion.dateLabel]}
                onSelect={() => void applySuggestion(suggestion)}
              >
                <CalendarDaysIcon aria-hidden="true" />
                <span>{suggestion.label}</span>
                <Command.Shortcut>{suggestion.dateLabel}</Command.Shortcut>
              </Command.Item>
            {/each}
          </Command.Group>
        {:else}
          <Command.Empty forceMount>
            No date suggestion
          </Command.Empty>
        {/if}
      {/if}
    </Command.List>
  </Command.Root>

  {#if !naturalQuery}
    {#if isDueMode}
      <div class="task-when-picker-content__quick task-when-picker-content__quick--single">
        <button
          type="button"
          class="task-when-picker-content__quick-row"
          onclick={() => void applyToday()}
        >
          <span
            class="task-when-picker-content__quick-icon task-when-picker-content__quick-icon--star"
          >
            <StarIcon />
          </span>
          <span>Today</span>
          {#if isTodaySelected}
            <span class="task-when-picker-content__quick-check">
              <CheckIcon />
            </span>
          {/if}
        </button>
      </div>
    {:else}
      <div class="task-when-picker-content__quick">
        <button
          type="button"
          class="task-when-picker-content__quick-row"
          onclick={() => void applyPlacement("this-evening")}
        >
          <span
            class="task-when-picker-content__quick-icon task-when-picker-content__quick-icon--moon"
          >
            <MoonIcon />
          </span>
          <span>This Evening</span>
          {#if when === "this-evening"}
            <span class="task-when-picker-content__quick-check">
              <CheckIcon />
            </span>
          {/if}
        </button>
        <button
          type="button"
          class="task-when-picker-content__quick-row"
          onclick={() => void applyPlacement("today")}
        >
          <span
            class="task-when-picker-content__quick-icon task-when-picker-content__quick-icon--star"
          >
            <StarIcon />
          </span>
          <span>Today</span>
          {#if isTodaySelected}
            <span class="task-when-picker-content__quick-check">
              <CheckIcon />
            </span>
          {/if}
        </button>
      </div>
    {/if}

    <TaskDueCalendar
      bind:value={selectedDate}
      onValueChange={(nextValue) => {
        if (nextValue) {
          selectedDate = nextValue;
          void onSelectDate?.(taskDateFromCalendarDate(nextValue));
        }
      }}
    />

    {#if !isDueMode}
      <div class="task-when-picker-content__quick">
        <button
          type="button"
          class="task-when-picker-content__quick-row"
          onclick={() => void applyPlacement("anytime")}
        >
          <span class="task-when-picker-content__quick-icon">
            <CalendarDaysIcon />
          </span>
          <span>Anytime</span>
          {#if when === "anytime"}
            <span class="task-when-picker-content__quick-check">
              <CheckIcon />
            </span>
          {/if}
        </button>
        <button
          type="button"
          class="task-when-picker-content__quick-row"
          onclick={() => void applyPlacement("someday")}
        >
          <span class="task-when-picker-content__quick-icon">
            <ArchiveIcon />
          </span>
          <span>Someday</span>
          {#if when === "someday"}
            <span class="task-when-picker-content__quick-check">
              <CheckIcon />
            </span>
          {/if}
        </button>
      </div>
    {/if}

    {#if clearable}
      <div class="task-when-picker-content__actions">
        <button
          type="button"
          class="task-when-picker-content__clear"
          onclick={() => void clearSchedule()}
        >
          Clear
        </button>
      </div>
    {/if}
  {/if}
</div>
