<script lang="ts">
  import "./ApplicationTaskRepeatPicker.css";
  import AlertTriangleIcon from "@lucide/svelte/icons/triangle-alert";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import Repeat2Icon from "@lucide/svelte/icons/repeat-2";
  import FormSheet from "@lapismd/design-core/forms/FormSheet.svelte";
  import * as Collapsible from "@lapismd/design-core/shadcn/collapsible";
  import * as CommandView from "@lapismd/design-core/shadcn/command-view";
  import { Input } from "@lapismd/design-core/shadcn/input";
  import * as Popover from "@lapismd/design-core/shadcn/popover";
  import * as Select from "@lapismd/design-core/shadcn/select";
  import type {
    LocalDateString,
    TaskRepeat,
    TaskRepeatAnchor,
    TaskRepeatMissed,
    TaskTracking,
  } from "../../model";
  import {
    analyzeRecurrenceRule,
    buildTaskRepeatPresentation,
    isLocalDateString,
    taskRepeatForPreset,
    taskRepeatPresetFor,
    todayDateOnly,
    type TaskRepeatPreset,
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
  let rdateText = $state("");
  let exdateText = $state("");
  let resetChecklist = $state(false);
  let paused = $state(false);
  let trackingType = $state<TrackingType>("none");
  let trackingUnit = $state("");
  let trackingTarget = $state("");
  let validationMessage = $state<string | null>(null);
  const uid = $props.id();

  const weekdayOptions = [
    ["MO", "Mon"], ["TU", "Tue"], ["WE", "Wed"], ["TH", "Thu"],
    ["FR", "Fri"], ["SA", "Sat"], ["SU", "Sun"],
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
    return repeat.rrule;
  });

  function partValue(rule: string, key: string): string | undefined {
    return rule.split(";").find((part) => part.startsWith(`${key}=`))?.slice(key.length + 1);
  }

  function syncControlsFromRepeat() {
    const rule = repeat?.rrule ?? "FREQ=WEEKLY";
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
    rawRrule = rule;
    rawMode = invalidRepeat !== undefined || analyzeRecurrenceRule(rule).status === "unsupported";
    anchor = repeat?.anchor ?? "schedule";
    missed = repeat?.missed ?? "carry";
    rdateText = repeat?.rdate?.join(", ") ?? "";
    exdateText = repeat?.exdate?.join(", ") ?? "";
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

  function toggleWeekday(day: string) {
    weekdays = weekdays.includes(day) ? weekdays.filter((value) => value !== day) : [...weekdays, day];
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

  function parseDateList(value: string, name: string): LocalDateString[] | undefined {
    if (!value.trim()) return undefined;
    const dates = value.split(/[\s,]+/u).map((date) => date.trim()).filter(Boolean);
    if (!dates.every(isLocalDateString)) throw new Error(`${name} must contain only YYYY-MM-DD dates.`);
    return [...new Set(dates)] as LocalDateString[];
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
      const rdate = parseDateList(rdateText, "Additional dates");
      const exdate = parseDateList(exdateText, "Excluded dates");
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
    <div class="task-repeat-picker__custom" aria-label="Custom recurrence form">
      <label class="task-repeat-picker__check">
        <input type="checkbox" bind:checked={rawMode} />
        <span>Edit raw RRULE</span>
      </label>
      {#if rawMode}
        <label class="task-repeat-picker__stack">
          <span>RRULE property value</span>
          <Input
            bind:value={rawRrule}
            aria-label="Raw RRULE"
            placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR"
          />
        </label>
      {:else}
        <label>
          <span>Every</span>
          <Input
            type="number"
            min="1"
            step="1"
            bind:value={interval}
            aria-label="Recurrence interval"
          />
        </label>
        <div class="task-repeat-picker__custom-field">
          <span>Frequency</span>
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
        {#if frequency === "WEEKLY"}
          <fieldset class="task-repeat-picker__weekdays">
            <legend>Weekdays</legend>
            {#each weekdayOptions as [day, dayLabel]}
              <label>
                <input
                  type="checkbox"
                  checked={weekdays.includes(day)}
                  onchange={() => toggleWeekday(day)}
                />
                <span>{dayLabel}</span>
              </label>
            {/each}
          </fieldset>
        {/if}
        {#if frequency === "MONTHLY"}
          <div class="task-repeat-picker__custom-field">
            <span>Monthly rule</span>
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
                  <Select.Item value="month-day" label="Calendar day">
                    Calendar day
                  </Select.Item>
                  <Select.Item value="position" label="Positional weekday">
                    Positional weekday
                  </Select.Item>
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </div>
          {#if monthlyMode === "position"}
            <label>
              <span>Position</span>
              <Input
                type="number"
                min="-5"
                max="5"
                bind:value={position}
                aria-label="Monthly position"
              />
            </label>
            <div class="task-repeat-picker__custom-field">
              <span>Weekday</span>
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
          {:else}
            <label>
              <span>Month day</span>
              <Input
                type="number"
                min="-31"
                max="31"
                bind:value={monthDay}
                aria-label="Month day"
              />
            </label>
          {/if}
        {/if}
        {#if frequency === "YEARLY"}
          <label>
            <span>Month</span>
            <Input
              type="number"
              min="1"
              max="12"
              bind:value={yearMonth}
              aria-label="Year month"
            />
          </label>
          <label>
            <span>Month day</span>
            <Input
              type="number"
              min="1"
              max="31"
              bind:value={monthDay}
              aria-label="Year month day"
            />
          </label>
        {/if}
        <div class="task-repeat-picker__custom-field">
          <span>Ends</span>
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
        </div>
        {#if endMode === "count"}
          <label>
            <span>Occurrences</span>
            <Input
              type="number"
              min="1"
              bind:value={count}
              aria-label="Recurrence count"
            />
          </label>
        {/if}
        {#if endMode === "until"}
          <label>
            <span>Until</span>
            <Input type="date" bind:value={until} aria-label="Recurrence until" />
          </label>
        {/if}
      {/if}
      <div class="task-repeat-picker__custom-field">
        <span>Missed dates</span>
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
      </div>
      <div class="task-repeat-picker__custom-field">
        <span>Advance from</span>
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
              <Select.Item value="schedule" label="Scheduled date">
                Scheduled date
              </Select.Item>
              <Select.Item value="completion" label="Completion date">
                Completion date
              </Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>
      <label class="task-repeat-picker__stack">
        <span>Additional dates (RDATE)</span>
        <Input
          bind:value={rdateText}
          aria-label="Additional recurrence dates"
          placeholder="2026-09-01, 2026-09-03"
        />
      </label>
      <label class="task-repeat-picker__stack">
        <span>Excluded dates (EXDATE)</span>
        <Input
          bind:value={exdateText}
          aria-label="Excluded recurrence dates"
          placeholder="2026-09-02"
        />
      </label>
      <label class="task-repeat-picker__check">
        <input type="checkbox" bind:checked={resetChecklist} />
        <span>Reset checklist on completion</span>
      </label>
      <label class="task-repeat-picker__check">
        <input type="checkbox" bind:checked={paused} />
        <span>{paused ? "Recurrence paused" : "Pause recurrence"}</span>
      </label>
      <div class="task-repeat-picker__custom-field">
        <span>Tracking</span>
        <Select.Root type="single" bind:value={trackingType}>
          <Select.Trigger
            role="combobox"
            aria-label="Habit tracking type"
            aria-controls={`${uid}-recurrence-tracking-options`}
          >
            {trackingTypeLabels[trackingType]}
          </Select.Trigger>
          <Select.Content
            id={`${uid}-recurrence-tracking-options`}
            aria-label="Habit tracking type options"
            portalProps={{ disabled: true }}
          >
            <Select.Group>
              <Select.Item value="none" label="None">None</Select.Item>
              <Select.Item value="boolean" label="Boolean">Boolean</Select.Item>
              <Select.Item value="count" label="Count">Count</Select.Item>
              <Select.Item value="duration" label="Duration">Duration</Select.Item>
              <Select.Item value="number" label="Number">Number</Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
      </div>
      {#if trackingType === "count" || trackingType === "number"}
        <label>
          <span>Unit</span>
          <Input
            bind:value={trackingUnit}
            aria-label="Tracking unit"
            placeholder="glasses"
          />
        </label>
      {/if}
      {#if trackingType !== "none" && trackingType !== "boolean"}
        <label>
          <span>Target</span>
          <Input
            type={trackingType === "duration" ? "text" : "number"}
            min={trackingType === "duration" ? undefined : "0"}
            bind:value={trackingTarget}
            aria-label="Tracking target"
            placeholder={trackingType === "duration" ? "30m" : "8"}
          />
        </label>
      {/if}
      {#if validationMessage}
        <div class="task-repeat-picker__validation" role="alert">
          {validationMessage}
        </div>
      {/if}
      <button
        type="button"
        class="task-repeat-picker__apply"
        onclick={() => void applyCustom()}
      >
        Apply recurrence
      </button>
    </div>
  </FormSheet>
</div>
