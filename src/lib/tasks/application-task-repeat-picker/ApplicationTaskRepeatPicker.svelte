<script lang="ts">
  import "./ApplicationTaskRepeatPicker.css";
  import AlertTriangleIcon from "@lucide/svelte/icons/triangle-alert";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import Repeat2Icon from "@lucide/svelte/icons/repeat-2";
  import { ChipAutocomplete, CyclePicker } from "@lapismd/design-core/forms";
  import FormSheet from "@lapismd/design-core/forms/FormSheet.svelte";
  import { Button } from "@lapismd/design-core/shadcn/button";
  import * as Collapsible from "@lapismd/design-core/shadcn/collapsible";
  import * as Command from "@lapismd/design-core/shadcn/command";
  import * as CommandView from "@lapismd/design-core/shadcn/command-view";
  import * as Field from "@lapismd/design-core/shadcn/field";
  import { Input } from "@lapismd/design-core/shadcn/input";
  import * as Popover from "@lapismd/design-core/shadcn/popover";
  import * as Select from "@lapismd/design-core/shadcn/select";
  import { Switch } from "@lapismd/design-core/shadcn/switch";
  import * as ToggleGroup from "@lapismd/design-core/shadcn/toggle-group";
  import type {
    LocalDateString,
    TaskRepeat,
    TaskRepeatAnchor,
    TaskRepeatMissed,
    TaskTracking,
  } from "../../model";
  import {
    analyzeRecurrenceRule,
    buildNaturalTaskRepeatSuggestions,
    buildTaskRepeatPresentation,
    buildTaskPlannerWeek,
    formatTaskRepeatRule,
    isLocalDateString,
    parseNaturalDueDate,
    taskRepeatForPreset,
    taskRepeatPresetFor,
    todayDateOnly,
    type TaskRepeatPreset,
    type TaskNaturalRepeatSuggestion,
  } from "../../model";

  type EditableFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  type TrackingType = "none" | TaskTracking["type"];
  type EndMode = "never" | "count" | "until";
  type MonthlyMode = "month-day" | "position";

  let {
    repeat = undefined,
    tracking = undefined,
    invalidRepeat = undefined,
    plannedDate = null,
    now = undefined,
    onSelect = null,
  }: {
    repeat?: TaskRepeat;
    tracking?: TaskTracking;
    invalidRepeat?: unknown;
    plannedDate?: string | null;
    now?: Date;
    onSelect?:
      | ((
          repeat: TaskRepeat | undefined,
          tracking: TaskTracking | undefined,
        ) => void | Promise<void>)
      | null;
  } = $props();

  let open = $state(false);
  let repeatEveryOpen = $state(false);
  let customSheetOpen = $state(false);
  let rawMode = $state(false);
  let rawRrule = $state("FREQ=WEEKLY");
  let naturalRuleInput = $state("");
  let frequency = $state<EditableFrequency>("WEEKLY");
  let interval = $state(1);
  let weekdays = $state<string[]>([]);
  let monthlyMode = $state<MonthlyMode>("month-day");
  let monthDay = $state(1);
  let position = $state(1);
  let positionalWeekday = $state("MO");
  let yearMonth = $state(1);
  let anchor = $state<TaskRepeatAnchor>("schedule");
  let missed = $state<TaskRepeatMissed>("carry");
  let endMode = $state<EndMode>("never");
  let count = $state(1);
  let until = $state("");
  let rdateValues = $state<LocalDateString[]>([]);
  let exdateValues = $state<LocalDateString[]>([]);
  let resetChecklist = $state(false);
  let paused = $state(false);
  let trackingType = $state<TrackingType>("none");
  let trackingUnit = $state("");
  let trackingTarget = $state("");
  let validationMessage = $state<string | null>(null);
  const uid = $props.id();

  const weekdayOptions = [
    ["MO", "Mon", "Monday"],
    ["TU", "Tue", "Tuesday"],
    ["WE", "Wed", "Wednesday"],
    ["TH", "Thu", "Thursday"],
    ["FR", "Fri", "Friday"],
    ["SA", "Sat", "Saturday"],
    ["SU", "Sun", "Sunday"],
  ] as const;
  const frequencyLabels: Record<EditableFrequency, string> = {
    DAILY: "Days", WEEKLY: "Weeks", MONTHLY: "Months", YEARLY: "Years",
  };
  const monthlyModeLabels: Record<MonthlyMode, string> = {
    "month-day": "Calendar day", position: "Positional weekday",
  };
  const endModeLabels: Record<EndMode, string> = {
    never: "Never", count: "After count", until: "On date",
  };
  const trackingTypeLabels: Record<TrackingType, string> = {
    none: "None", boolean: "Boolean", count: "Count", duration: "Duration", number: "Number",
  };
  const trackingOptions = Object.entries(trackingTypeLabels).map(
    ([value, label]) => ({ value, label }),
  );
  const naturalDateInputs = [
    "Today",
    "Tomorrow",
    "Next week",
    "Next Monday",
    "Next Friday",
  ];
  const anchorLabels: Record<TaskRepeatAnchor, string> = {
    schedule: "Scheduled date", completion: "Completion date",
  };
  const missedLabels: Record<TaskRepeatMissed, string> = {
    carry: "Carry overdue", skip: "Skip missed dates",
  };

  const preset = $derived(taskRepeatPresetFor(repeat));
  const repeatEverySelected = $derived.by(() => {
    if (!repeat || preset !== "custom") return false;
    return (
      /^FREQ=(?:DAILY|WEEKLY|MONTHLY|YEARLY)(?:;INTERVAL=\d+)?$/u.test(repeat.rrule) &&
      repeat.anchor === "schedule" &&
      repeat.missed === "carry" &&
      !repeat.resetChecklist &&
      !repeat.rdate?.length &&
      !repeat.exdate?.length &&
      !repeat.paused &&
      !repeat.pauseRanges?.length
    );
  });
  const customSelected = $derived(preset === "custom" && !repeatEverySelected);
  const activePreset = $derived(
    repeatEverySelected ? "repeat-every" : customSelected ? "custom" : preset,
  );
  const presentation = $derived(buildTaskRepeatPresentation(plannedDate, now ?? new Date()));
  const recurrenceWeek = $derived(
    buildTaskPlannerWeek(
      presentation.referenceDate,
      todayDateOnly(now ?? new Date()),
    ),
  );
  const naturalRuleSuggestions = $derived(
    buildNaturalTaskRepeatSuggestions(naturalRuleInput),
  );
  const retainedInvalid = $derived(
    invalidRepeat === undefined ? null : JSON.stringify(invalidRepeat, null, 2),
  );
  const unsupportedWarning = $derived.by(() => {
    if (!repeat) return null;
    const analysis = analyzeRecurrenceRule(repeat.rrule);
    return analysis.status === "unsupported"
      ? `Automatic advancement is blocked: ${analysis.parts.join(", ")}.`
      : null;
  });
  const label = $derived.by(() => {
    if (invalidRepeat !== undefined) return "Recurrence needs attention";
    if (!repeat) return "Does not repeat";
    const knownPreset = taskRepeatPresetFor(repeat);
    if (knownPreset !== "custom") {
      return presentation.options.find((option) => option.value === knownPreset)?.label ?? "Does not repeat";
    }
    return formatTaskRepeatRule(repeat.rrule);
  });

  function partValue(rule: string, key: string): string | undefined {
    return rule.split(";").find((part) => part.startsWith(`${key}=`))?.slice(key.length + 1);
  }

  function syncStructuredRule(rule: string) {
    const nextFrequency = partValue(rule, "FREQ");
    frequency = nextFrequency === "DAILY" || nextFrequency === "WEEKLY" || nextFrequency === "MONTHLY" || nextFrequency === "YEARLY"
      ? nextFrequency : "WEEKLY";
    interval = Number(partValue(rule, "INTERVAL") ?? 1);
    const parsedWeekdays = (partValue(rule, "BYDAY") ?? "")
      .split(",")
      .filter((value) => weekdayOptions.some(([day]) => day === value));
    weekdays = parsedWeekdays;
    monthDay = Number(
      partValue(rule, "BYMONTHDAY") ?? presentation.referenceDate.slice(8, 10),
    );
    position = Number(partValue(rule, "BYSETPOS") ?? 1);
    positionalWeekday = parsedWeekdays[0] ?? "MO";
    monthlyMode = partValue(rule, "BYSETPOS") ? "position" : "month-day";
    yearMonth = Number(
      partValue(rule, "BYMONTH") ?? presentation.referenceDate.slice(5, 7),
    );
    const countValue = partValue(rule, "COUNT");
    const untilValue = partValue(rule, "UNTIL");
    endMode = countValue ? "count" : untilValue ? "until" : "never";
    count = Number(countValue ?? 1);
    until = untilValue ? `${untilValue.slice(0, 4)}-${untilValue.slice(4, 6)}-${untilValue.slice(6, 8)}` : "";
  }

  function syncControlsFromRepeat() {
    const rule = repeat?.rrule ?? "FREQ=WEEKLY";
    syncStructuredRule(rule);
    rawRrule = rule;
    naturalRuleInput = "";
    rawMode = invalidRepeat !== undefined || analyzeRecurrenceRule(rule).status === "unsupported";
    anchor = repeat?.anchor ?? "schedule";
    missed = repeat?.missed ?? "carry";
    rdateValues = [...(repeat?.rdate ?? [])];
    exdateValues = [...(repeat?.exdate ?? [])];
    resetChecklist = repeat?.resetChecklist ?? false;
    paused = repeat?.paused ?? false;
    trackingType = tracking?.type ?? "none";
    trackingUnit = tracking?.type === "count" || tracking?.type === "number" ? tracking.unit : "";
    trackingTarget =
      tracking && tracking.type !== "boolean"
        ? tracking.target?.toString() ?? ""
        : "";
    repeatEveryOpen = repeatEverySelected;
    validationMessage = null;
  }

  function handlePopoverOpenChange(next: boolean) {
    open = next;
    if (next) syncControlsFromRepeat();
  }

  function closePopover() { open = false; }

  function openCustomSheet() {
    closePopover();
    queueMicrotask(() => {
      customSheetOpen = true;
    });
  }

  async function selectPreset(value: Exclude<TaskRepeatPreset, "custom">) {
    await onSelect?.(
      taskRepeatForPreset(value, repeat, presentation.referenceDate),
      value === "none" ? undefined : tracking,
    );
    closePopover();
  }

  function isEditableFrequency(value: unknown): value is EditableFrequency {
    return value === "DAILY" || value === "WEEKLY" || value === "MONTHLY" || value === "YEARLY";
  }

  function isTrackingType(value: string): value is TrackingType {
    return value in trackingTypeLabels;
  }

  async function applyRepeatEvery(nextFrequency = frequency) {
    frequency = nextFrequency;
    interval = Math.max(1, Math.trunc(interval || 1));
    const base = taskRepeatForPreset(
      "daily",
      repeat,
      presentation.referenceDate,
    )!;
    const rrule = `FREQ=${frequency}${interval === 1 ? "" : `;INTERVAL=${interval}`}`;
    try {
      await onSelect?.({ ...base, rrule }, tracking);
      validationMessage = null;
    } catch (error) {
      validationMessage = error instanceof Error ? error.message : String(error);
    }
  }

  function buildStructuredRule(): string {
    const parts = [`FREQ=${frequency}`];
    const normalizedInterval = Math.max(1, Math.trunc(interval || 1));
    if (normalizedInterval !== 1) parts.push(`INTERVAL=${normalizedInterval}`);
    if (frequency === "WEEKLY" && weekdays.length) parts.push(`BYDAY=${weekdays.join(",")}`);
    if (frequency === "MONTHLY") {
      if (monthlyMode === "position") {
        parts.push(`BYDAY=${positionalWeekday}`);
        parts.push(`BYSETPOS=${Math.max(-5, Math.min(5, Math.trunc(position || 1)))}`);
      } else {
        parts.push(`BYMONTHDAY=${Math.max(-31, Math.min(31, Math.trunc(monthDay || 1)))}`);
      }
    }
    if (frequency === "YEARLY") {
      parts.push(`BYMONTH=${Math.max(1, Math.min(12, Math.trunc(yearMonth || 1)))}`);
      parts.push(`BYMONTHDAY=${Math.max(1, Math.min(31, Math.trunc(monthDay || 1)))}`);
    }
    if (endMode === "count") parts.push(`COUNT=${Math.max(1, Math.trunc(count || 1))}`);
    else if (endMode === "until" && isLocalDateString(until)) parts.push(`UNTIL=${until.replaceAll("-", "")}`);
    return parts.join(";");
  }

  function normalizeDateChips(
    values: string[],
    name: string,
  ): LocalDateString[] | null {
    const normalized: LocalDateString[] = [];
    for (const rawValue of values) {
      const value = rawValue.trim();
      const parsed = isLocalDateString(value)
        ? value
        : parseNaturalDueDate(value, now ?? new Date());
      if (!parsed || !isLocalDateString(parsed)) {
        validationMessage = `${name} could not understand “${value}”. Enter a date such as tomorrow, next Friday, or 2026-09-01.`;
        return null;
      }
      if (!normalized.includes(parsed)) normalized.push(parsed);
    }
    validationMessage = null;
    return normalized;
  }

  function updateAdditionalDates(values: string[]) {
    const normalized = normalizeDateChips(values, "Additional dates");
    if (normalized) rdateValues = normalized;
  }

  function updateExcludedDates(values: string[]) {
    const normalized = normalizeDateChips(values, "Excluded dates");
    if (normalized) exdateValues = normalized;
  }

  function selectNaturalRule(suggestion: TaskNaturalRepeatSuggestion) {
    rawRrule = suggestion.rrule;
    const analysis = analyzeRecurrenceRule(suggestion.rrule);
    rawMode = analysis.status === "unsupported";
    if (!rawMode) syncStructuredRule(suggestion.rrule);
    naturalRuleInput = suggestion.input;
    validationMessage = null;
  }

  function previousDate(value: LocalDateString): LocalDateString {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year!, month! - 1, day! - 1)).toISOString().slice(0, 10) as LocalDateString;
  }

  function buildTracking(): TaskTracking | undefined {
    if (trackingType === "none") return undefined;
    if (trackingType === "boolean") return { type: "boolean" };
    const targetText = String(trackingTarget).trim();
    if (trackingType === "duration") {
      return { type: "duration", ...(targetText ? { target: targetText } : {}) };
    }
    const unit = trackingUnit.trim();
    if (!unit) throw new Error("Count and number tracking require a unit.");
    const target = targetText ? Number(targetText) : undefined;
    if (target !== undefined && (!Number.isFinite(target) || target <= 0)) throw new Error("Tracking target must be a positive number.");
    return { type: trackingType, unit, ...(target ? { target } : {}) };
  }

  async function applyCustom() {
    try {
      const rrule = rawMode ? rawRrule.trim() : buildStructuredRule();
      const analysis = analyzeRecurrenceRule(rrule);
      if (analysis.status === "invalid") throw new Error(analysis.message);
      if (endMode === "until" && !rawMode && !isLocalDateString(until)) throw new Error("Until must be a YYYY-MM-DD date.");
      const actionDate = todayDateOnly(now ?? new Date()) as LocalDateString;
      const rdate = rdateValues.length ? rdateValues : undefined;
      const exdate = exdateValues.length ? exdateValues : undefined;
      const pauseRanges = [...(repeat?.pauseRanges ?? [])];
      let pausedSince = repeat?.pausedSince;
      if (paused && !repeat?.paused) pausedSince = actionDate;
      if (!paused && repeat?.paused && repeat.pausedSince) {
        const end = previousDate(actionDate);
        if (end >= repeat.pausedSince) pauseRanges.push({ start: repeat.pausedSince, end });
        pausedSince = undefined;
      }
      const nextRepeat: TaskRepeat = {
        ...(anchor === "schedule"
          ? { start: (repeat?.start ?? presentation.referenceDate) as LocalDateString }
          : repeat?.start ? { start: repeat.start } : {}),
        rrule,
        anchor,
        missed: anchor === "completion" ? "carry" : missed,
        ...(rdate?.length ? { rdate } : {}),
        ...(exdate?.length ? { exdate } : {}),
        ...(resetChecklist ? { resetChecklist: true } : {}),
        ...(paused ? { paused: true, pausedSince } : {}),
        ...(pauseRanges.length ? { pauseRanges } : {}),
        ...(repeat?.lastCompletedAt ? { lastCompletedAt: repeat.lastCompletedAt } : {}),
        ...(repeat?.completionCount != null ? { completionCount: repeat.completionCount } : {}),
      };
      validationMessage = analysis.status === "unsupported"
        ? `Saved for visibility only. Automatic advancement is blocked: ${analysis.parts.join(", ")}.`
        : null;
      await onSelect?.(nextRepeat, buildTracking());
      customSheetOpen = false;
    } catch (error) {
      validationMessage = error instanceof Error ? error.message : String(error);
    }
  }
</script>

<div class="task-repeat-picker" data-task-repeat-picker>
  <Popover.Root bind:open onOpenChange={handlePopoverOpenChange}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          type="button"
          class="task-repeat-picker__trigger"
          aria-label="Set task recurrence"
        >
          <Repeat2Icon aria-hidden="true" />
          <span>{label}</span>
          <ChevronDownIcon aria-hidden="true" />
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      class="task-repeat-picker__panel"
      style="--ui-popover-width: 26rem"
      align="start"
      sideOffset={6}
      role="dialog"
      aria-label="Choose task recurrence"
      trapFocus={false}
      onFocusOutside={closePopover}
      onpointerdown={(event) => event.stopPropagation()}
    >
      <div class="task-repeat-picker__reference-date">
        <CalendarDaysIcon aria-hidden="true" />
        <span>{presentation.referenceDateLabel}</span>
      </div>
      {#if retainedInvalid}
        <div class="task-repeat-picker__warning" role="alert">
          <AlertTriangleIcon aria-hidden="true" />
          <div>
            <strong>Legacy or invalid recurrence</strong>
            <span>
              It is preserved but cannot advance. Replace it with a preset or
              custom recurrence, or remove recurrence.
            </span>
            <pre>{retainedInvalid}</pre>
          </div>
        </div>
      {:else if unsupportedWarning}
        <div class="task-repeat-picker__warning" role="alert">
          <AlertTriangleIcon aria-hidden="true" />
          <div>
            <strong>Unsupported RRULE</strong>
            <span>
              {unsupportedWarning} Replace it with a supported preset or custom
              rule, or remove recurrence.
            </span>
          </div>
        </div>
      {/if}
      <CommandView.Root value={activePreset} label="Recurrence presets" loop>
        <CommandView.List aria-label="Recurrence presets">
          <CommandView.Group value="presets">
          <CommandView.Item
            value="none"
            data-checked={preset === "none"}
            aria-current={preset === "none" ? "true" : undefined}
            onSelect={() => void selectPreset("none")}
          >
            <CommandView.ItemIcon>
              <CalendarDaysIcon aria-hidden="true" />
            </CommandView.ItemIcon>
            <CommandView.ItemLabel>Does not repeat</CommandView.ItemLabel>
            {#if preset === "none"}
              <CheckIcon
                class="task-repeat-picker__selected"
                data-ui-part="trailing"
                aria-hidden="true"
              />
            {/if}
          </CommandView.Item>
          {#each presentation.options as option (option.value)}
            <CommandView.Item
              value={option.value}
              data-checked={preset === option.value}
              aria-current={preset === option.value ? "true" : undefined}
              onSelect={() => void selectPreset(option.value)}
            >
              <CommandView.ItemIcon>
                <Repeat2Icon aria-hidden="true" />
              </CommandView.ItemIcon>
              <CommandView.ItemLabel>
                {option.label}{#if option.context}{" "}<span
                    class="task-repeat-picker__option-context"
                    >{option.context}</span
                  >{/if}
              </CommandView.ItemLabel>
              {#if preset === option.value}
                <CheckIcon
                  class="task-repeat-picker__selected"
                  data-ui-part="trailing"
                  aria-hidden="true"
                />
              {/if}
            </CommandView.Item>
          {/each}
          <Collapsible.Root
            bind:open={repeatEveryOpen}
            class="task-repeat-picker__repeat-every"
          >
            <Collapsible.Trigger
              class="task-repeat-picker__repeat-every-trigger"
              aria-label="Repeat every"
            >
              <Repeat2Icon aria-hidden="true" />
              <span>Repeat every…</span>
              <span class="task-repeat-picker__repeat-every-trailing">
                {#if repeatEverySelected}
                  <CheckIcon aria-hidden="true" />
                {/if}
                <ChevronDownIcon aria-hidden="true" />
              </span>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <div class="task-repeat-picker__repeat-every-controls">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  bind:value={interval}
                  aria-label="Repeat every interval"
                  onchange={() => void applyRepeatEvery()}
                />
                <Select.Root
                  type="single"
                  value={frequency}
                  onValueChange={(value) => {
                    if (!isEditableFrequency(value)) return;
                    void applyRepeatEvery(value);
                  }}
                >
                  <Select.Trigger
                    role="combobox"
                    aria-label="Repeat every frequency"
                    aria-controls={`${uid}-repeat-every-frequency-options`}
                  >
                    {frequencyLabels[frequency]}
                  </Select.Trigger>
                  <Select.Content
                    id={`${uid}-repeat-every-frequency-options`}
                    aria-label="Repeat every frequency options"
                    portalProps={{ disabled: true }}
                  >
                    <Select.Group>
                      <Select.Item value="DAILY" label="Days">Days</Select.Item>
                      <Select.Item value="WEEKLY" label="Weeks">Weeks</Select.Item>
                      <Select.Item value="MONTHLY" label="Months">Months</Select.Item>
                      <Select.Item value="YEARLY" label="Years">Years</Select.Item>
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </div>
              {#if validationMessage}
                <div class="task-repeat-picker__validation" role="alert">
                  {validationMessage}
                </div>
              {/if}
            </Collapsible.Content>
          </Collapsible.Root>
          <CommandView.Item
            value="custom"
            data-checked={customSelected}
            aria-current={customSelected ? "true" : undefined}
            onSelect={openCustomSheet}
          >
            <CommandView.ItemIcon>
              <Repeat2Icon aria-hidden="true" />
            </CommandView.ItemIcon>
            <CommandView.ItemLabel>Custom recurrence…</CommandView.ItemLabel>
            {#if customSelected}
              <CheckIcon
                class="task-repeat-picker__selected"
                data-ui-part="trailing"
                aria-hidden="true"
              />
            {/if}
          </CommandView.Item>
        </CommandView.Group>
        </CommandView.List>
      </CommandView.Root>
    </Popover.Content>
  </Popover.Root>

  <FormSheet
    bind:open={customSheetOpen}
    title="Custom recurrence"
    description="Configure a custom recurrence rule and task tracking options."
    bodyDensity="dense"
    class="task-repeat-picker__sheet"
  >
    <div
      class="task-repeat-picker__custom"
      role="form"
      aria-label="Custom recurrence form"
    >
      <Field.Group class="task-repeat-picker__settings">
        <Field.Set class="task-repeat-picker__settings-section">
          <Field.Legend>Schedule</Field.Legend>
          <Field.Description>
            Choose when this task repeats and when the series ends.
          </Field.Description>
          <div class="task-repeat-picker__settings-card">
            <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
              <Field.Label for={`${uid}-natural-rule`}>
                Describe recurrence
              </Field.Label>
              <Field.Description>
                Try “every weekday” or “every 2 weeks on Monday”.
              </Field.Description>
              <Command.Root
                class="task-repeat-picker__natural-rule"
                label="Describe recurrence"
                shouldFilter={false}
                loop
              >
                <Command.Input
                  id={`${uid}-natural-rule`}
                  bind:value={naturalRuleInput}
                  aria-label="Describe recurrence"
                  placeholder="Every weekday"
                />
                {#if naturalRuleInput.trim()}
                  <Command.List aria-label="Natural-language recurrence matches">
                    {#if naturalRuleSuggestions.length}
                      <Command.Group value="matches">
                        {#each naturalRuleSuggestions as suggestion (suggestion.rrule)}
                          <Command.Item
                            value={suggestion.rrule}
                            onSelect={() => selectNaturalRule(suggestion)}
                          >
                            <Repeat2Icon aria-hidden="true" />
                            <span>{suggestion.label}</span>
                            <Command.Shortcut>{suggestion.rrule}</Command.Shortcut>
                          </Command.Item>
                        {/each}
                      </Command.Group>
                    {:else}
                      <Command.Empty forceMount>
                        No recurrence match
                      </Command.Empty>
                    {/if}
                  </Command.List>
                {/if}
              </Command.Root>
            </Field.Field>
            <Field.Field orientation="horizontal" class="task-repeat-picker__setting-row">
              <Field.Content>
                <Field.Label for={`${uid}-raw-rule`}>Edit raw RRULE</Field.Label>
                <Field.Description>
                  Use the RFC recurrence value directly for unsupported rules.
                </Field.Description>
              </Field.Content>
              <Switch
                id={`${uid}-raw-rule`}
                bind:checked={rawMode}
                aria-label="Edit raw RRULE"
              />
            </Field.Field>

            {#if rawMode}
              <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
                <Field.Label for={`${uid}-rrule`}>RRULE property value</Field.Label>
                <Input
                  id={`${uid}-rrule`}
                  bind:value={rawRrule}
                  aria-label="Raw RRULE"
                  placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR"
                />
              </Field.Field>
            {:else}
              <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
                <Field.Label>Repeat interval</Field.Label>
                <div class="task-repeat-picker__control-grid">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    bind:value={interval}
                    aria-label="Recurrence interval"
                  />
                  <Select.Root type="single" bind:value={frequency}>
                    <Select.Trigger
                      role="combobox"
                      aria-label="Recurrence frequency"
                      aria-controls={`${uid}-recurrence-frequency-options`}
                    >
                      {frequencyLabels[frequency]}
                    </Select.Trigger>
                    <Select.Content
                      id={`${uid}-recurrence-frequency-options`}
                      aria-label="Recurrence frequency options"
                      portalProps={{ disabled: true }}
                    >
                      <Select.Group>
                        <Select.Item value="DAILY" label="Days">Days</Select.Item>
                        <Select.Item value="WEEKLY" label="Weeks">Weeks</Select.Item>
                        <Select.Item value="MONTHLY" label="Months">Months</Select.Item>
                        <Select.Item value="YEARLY" label="Years">Years</Select.Item>
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>
                </div>
              </Field.Field>

              {#if frequency === "WEEKLY"}
                <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
                  <Field.Label>Weekdays</Field.Label>
                  <ToggleGroup.Root
                    type="multiple"
                    bind:value={weekdays}
                    variant="outline"
                    spacing={2}
                    size="sm"
                    aria-label="Recurrence weekdays"
                    class="task-repeat-picker__weekday-grid"
                  >
                    {#each recurrenceWeek as calendarDay, index (calendarDay.date)}
                      {@const [day, , fullDayLabel] = weekdayOptions[index]!}
                      <ToggleGroup.Item
                        value={day}
                        aria-label={fullDayLabel}
                        title={calendarDay.date}
                      >
                        <span class="task-repeat-picker__weekday-label">
                          {calendarDay.weekday}
                        </span>
                        <strong>{calendarDay.dayNumber}</strong>
                      </ToggleGroup.Item>
                    {/each}
                  </ToggleGroup.Root>
                </Field.Field>
              {/if}

              {#if frequency === "MONTHLY"}
                <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
                  <Field.Label>Monthly rule</Field.Label>
                  <Select.Root type="single" bind:value={monthlyMode}>
                    <Select.Trigger
                      role="combobox"
                      aria-label="Monthly recurrence mode"
                      aria-controls={`${uid}-recurrence-monthly-mode-options`}
                    >
                      {monthlyModeLabels[monthlyMode]}
                    </Select.Trigger>
                    <Select.Content
                      id={`${uid}-recurrence-monthly-mode-options`}
                      aria-label="Monthly recurrence mode options"
                      portalProps={{ disabled: true }}
                    >
                      <Select.Group>
                        <Select.Item value="month-day" label="Calendar day">Calendar day</Select.Item>
                        <Select.Item value="position" label="Positional weekday">Positional weekday</Select.Item>
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>
                </Field.Field>
                {#if monthlyMode === "position"}
                  <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
                    <Field.Label>Position and weekday</Field.Label>
                    <div class="task-repeat-picker__control-grid">
                      <Input
                        type="number"
                        min="-5"
                        max="5"
                        bind:value={position}
                        aria-label="Monthly position"
                      />
                      <Select.Root type="single" bind:value={positionalWeekday}>
                        <Select.Trigger
                          role="combobox"
                          aria-label="Monthly weekday"
                          aria-controls={`${uid}-recurrence-monthly-weekday-options`}
                        >
                          {weekdayOptions.find(([day]) => day === positionalWeekday)?.[1] ?? "Mon"}
                        </Select.Trigger>
                        <Select.Content
                          id={`${uid}-recurrence-monthly-weekday-options`}
                          aria-label="Monthly weekday options"
                          portalProps={{ disabled: true }}
                        >
                          <Select.Group>
                            {#each weekdayOptions as [day, dayLabel]}
                              <Select.Item value={day} label={dayLabel}>{dayLabel}</Select.Item>
                            {/each}
                          </Select.Group>
                        </Select.Content>
                      </Select.Root>
                    </div>
                  </Field.Field>
                {:else}
                  <Field.Field class="task-repeat-picker__setting-row">
                    <Field.Label for={`${uid}-month-day`}>Month day</Field.Label>
                    <Input
                      id={`${uid}-month-day`}
                      type="number"
                      min="-31"
                      max="31"
                      bind:value={monthDay}
                      aria-label="Month day"
                    />
                  </Field.Field>
                {/if}
              {/if}

              {#if frequency === "YEARLY"}
                <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
                  <Field.Label>Annual date</Field.Label>
                  <div class="task-repeat-picker__control-grid">
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      bind:value={yearMonth}
                      aria-label="Year month"
                    />
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      bind:value={monthDay}
                      aria-label="Year month day"
                    />
                  </div>
                </Field.Field>
              {/if}

              <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
                <Field.Label>Ends</Field.Label>
                <Select.Root type="single" bind:value={endMode}>
                  <Select.Trigger
                    role="combobox"
                    aria-label="Recurrence end condition"
                    aria-controls={`${uid}-recurrence-end-options`}
                  >
                    {endModeLabels[endMode]}
                  </Select.Trigger>
                  <Select.Content
                    id={`${uid}-recurrence-end-options`}
                    aria-label="Recurrence end condition options"
                    portalProps={{ disabled: true }}
                  >
                    <Select.Group>
                      <Select.Item value="never" label="Never">Never</Select.Item>
                      <Select.Item value="count" label="After count">After count</Select.Item>
                      <Select.Item value="until" label="On date">On date</Select.Item>
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </Field.Field>
              {#if endMode === "count"}
                <Field.Field class="task-repeat-picker__setting-row">
                  <Field.Label for={`${uid}-count`}>Occurrences</Field.Label>
                  <Input
                    id={`${uid}-count`}
                    type="number"
                    min="1"
                    bind:value={count}
                    aria-label="Recurrence count"
                  />
                </Field.Field>
              {/if}
              {#if endMode === "until"}
                <Field.Field class="task-repeat-picker__setting-row">
                  <Field.Label for={`${uid}-until`}>Until</Field.Label>
                  <Input
                    id={`${uid}-until`}
                    type="date"
                    bind:value={until}
                    aria-label="Recurrence until"
                  />
                </Field.Field>
              {/if}
            {/if}
          </div>
        </Field.Set>

        <Field.Set class="task-repeat-picker__settings-section">
          <Field.Legend>Behavior</Field.Legend>
          <Field.Description>
            Control advancement, exceptions, checklist resets, and pauses.
          </Field.Description>
          <div class="task-repeat-picker__settings-card">
            <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
              <Field.Label>Advance from</Field.Label>
              <Select.Root type="single" bind:value={anchor}>
                <Select.Trigger
                  role="combobox"
                  aria-label="Recurrence anchor"
                  aria-controls={`${uid}-recurrence-anchor-options`}
                >
                  {anchorLabels[anchor]}
                </Select.Trigger>
                <Select.Content
                  id={`${uid}-recurrence-anchor-options`}
                  aria-label="Recurrence anchor options"
                  portalProps={{ disabled: true }}
                >
                  <Select.Group>
                    <Select.Item value="schedule" label="Scheduled date">Scheduled date</Select.Item>
                    <Select.Item value="completion" label="Completion date">Completion date</Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </Field.Field>
            <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
              <Field.Label>Missed dates</Field.Label>
              <Select.Root
                type="single"
                bind:value={missed}
                disabled={anchor === "completion"}
              >
                <Select.Trigger
                  role="combobox"
                  aria-label="Missed occurrence policy"
                  aria-controls={`${uid}-recurrence-missed-options`}
                >
                  {missedLabels[anchor === "completion" ? "carry" : missed]}
                </Select.Trigger>
                <Select.Content
                  id={`${uid}-recurrence-missed-options`}
                  aria-label="Missed occurrence policy options"
                  portalProps={{ disabled: true }}
                >
                  <Select.Group>
                    <Select.Item value="carry" label="Carry overdue">Carry overdue</Select.Item>
                    <Select.Item value="skip" label="Skip missed dates">Skip missed dates</Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </Field.Field>
            <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
              <Field.Label>Additional dates</Field.Label>
              <Field.Description>
                Add dates outside the normal rule using natural language.
              </Field.Description>
              <ChipAutocomplete
                value={rdateValues}
                suggestions={naturalDateInputs}
                label="Additional recurrence dates"
                showLabel={false}
                uppercase={false}
                placeholder="Tomorrow or 2026-09-01"
                onChange={updateAdditionalDates}
              />
            </Field.Field>
            <Field.Field class="task-repeat-picker__setting-row task-repeat-picker__setting-row--stacked">
              <Field.Label>Excluded dates</Field.Label>
              <Field.Description>
                Skip individual dates using the same date language as Schedule.
              </Field.Description>
              <ChipAutocomplete
                value={exdateValues}
                suggestions={naturalDateInputs}
                label="Excluded recurrence dates"
                showLabel={false}
                uppercase={false}
                placeholder="Next Friday or 2026-09-03"
                onChange={updateExcludedDates}
              />
            </Field.Field>
            <Field.Field orientation="horizontal" class="task-repeat-picker__setting-row">
              <Field.Content>
                <Field.Label for={`${uid}-reset-checklist`}>
                  Reset checklist on completion
                </Field.Label>
                <Field.Description>
                  Start each occurrence with unchecked checklist items.
                </Field.Description>
              </Field.Content>
              <Switch
                id={`${uid}-reset-checklist`}
                bind:checked={resetChecklist}
                aria-label="Reset checklist on completion"
              />
            </Field.Field>
            <Field.Field orientation="horizontal" class="task-repeat-picker__setting-row">
              <Field.Content>
                <Field.Label for={`${uid}-paused`}>
                  {paused ? "Recurrence paused" : "Pause recurrence"}
                </Field.Label>
                <Field.Description>
                  Keep the rule without scheduling future occurrences.
                </Field.Description>
              </Field.Content>
              <Switch
                id={`${uid}-paused`}
                bind:checked={paused}
                aria-label={paused ? "Recurrence paused" : "Pause recurrence"}
              />
            </Field.Field>
          </div>
        </Field.Set>

        <Field.Set class="task-repeat-picker__settings-section">
          <Field.Legend>Tracking</Field.Legend>
          <Field.Description>
            Optionally track completion as a habit or measurable target.
          </Field.Description>
          <div class="task-repeat-picker__settings-card">
            <Field.Field orientation="horizontal" class="task-repeat-picker__setting-row">
              <Field.Content>
                <Field.Label>Tracking type</Field.Label>
                <Field.Description>
                  Cycle between boolean, count, duration, and numeric tracking.
                </Field.Description>
              </Field.Content>
              <CyclePicker
                value={trackingType}
                options={trackingOptions}
                ariaLabel="Tracking type"
                onChange={(value) => {
                  if (isTrackingType(value)) trackingType = value;
                }}
              />
            </Field.Field>
            {#if trackingType === "count" || trackingType === "number"}
              <Field.Field class="task-repeat-picker__setting-row">
                <Field.Label for={`${uid}-tracking-unit`}>Unit</Field.Label>
                <Input
                  id={`${uid}-tracking-unit`}
                  bind:value={trackingUnit}
                  aria-label="Tracking unit"
                  placeholder="glasses"
                />
              </Field.Field>
            {/if}
            {#if trackingType !== "none" && trackingType !== "boolean"}
              <Field.Field class="task-repeat-picker__setting-row">
                <Field.Label for={`${uid}-tracking-target`}>Target</Field.Label>
                <Input
                  id={`${uid}-tracking-target`}
                  type={trackingType === "duration" ? "text" : "number"}
                  min={trackingType === "duration" ? undefined : "0"}
                  bind:value={trackingTarget}
                  aria-label="Tracking target"
                  placeholder={trackingType === "duration" ? "30m" : "8"}
                />
              </Field.Field>
            {/if}
          </div>
        </Field.Set>
      </Field.Group>

      {#if validationMessage}
        <div class="task-repeat-picker__validation" role="alert">
          {validationMessage}
        </div>
      {/if}
      <div class="task-repeat-picker__sheet-actions">
        <Button type="button" onclick={() => void applyCustom()}>
          Apply recurrence
        </Button>
      </div>
    </div>
  </FormSheet>
</div>
