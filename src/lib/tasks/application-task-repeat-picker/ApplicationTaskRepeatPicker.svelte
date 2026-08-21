<script lang="ts">
  import "./ApplicationTaskRepeatPicker.css";
  import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import Repeat2Icon from "@lucide/svelte/icons/repeat-2";
  import * as CommandView from "@lapismd/design-core/shadcn/command-view";
  import * as Popover from "@lapismd/design-core/shadcn/popover";
  import * as Select from "@lapismd/design-core/shadcn/select";

  import type {
    TaskRepeat,
    TaskRepeatAnchor,
    TaskRepeatFrequency,
  } from "../../model";
  import {
    buildTaskRepeatPresentation,
    taskRepeatForPreset,
    taskRepeatPresetFor,
    type TaskRepeatPreset,
  } from "../../model";

  let {
    repeat = undefined,
    plannedDate = null,
    now = undefined,
    onSelect = null,
  }: {
    repeat?: TaskRepeat;
    plannedDate?: string | null;
    now?: Date;
    onSelect?: ((repeat: TaskRepeat | undefined) => void | Promise<void>) | null;
  } = $props();

  let open = $state(false);
  let custom = $state(false);
  let frequency = $state<TaskRepeatFrequency>("weekly");
  let interval = $state(1);
  let anchor = $state<TaskRepeatAnchor>("schedule");
  let resetChecklist = $state(false);
  const uid = $props.id();

  const frequencyLabels: Record<TaskRepeatFrequency, string> = {
    daily: "Days",
    weekly: "Weeks",
    monthly: "Months",
    yearly: "Years",
  };
  const anchorLabels: Record<TaskRepeatAnchor, string> = {
    schedule: "Scheduled date",
    completion: "Completion date",
  };

  const preset = $derived(taskRepeatPresetFor(repeat));
  const activePreset = $derived(custom ? "custom" : preset);
  const presentation = $derived(
    buildTaskRepeatPresentation(plannedDate, now ?? new Date()),
  );

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

  function closePopover() {
    open = false;
  }

  async function selectPreset(
    value: Exclude<TaskRepeatPreset, "custom">,
  ) {
    await onSelect?.(taskRepeatForPreset(value, repeat));
    closePopover();
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
    closePopover();
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
      onFocusOutside={closePopover}
      onpointerdown={(event) => event.stopPropagation()}
    >
      <div class="task-repeat-picker__reference-date">
        <CalendarDaysIcon aria-hidden="true" />
        <span>{presentation.referenceDateLabel}</span>
      </div>
      <CommandView.Root value={activePreset} label="Recurrence presets" loop>
        <CommandView.List aria-label="Recurrence presets">
          <CommandView.Group value="presets" heading="Presets">
            <CommandView.Item
              value="none"
              data-checked={preset === "none"}
              aria-current={preset === "none" ? "true" : undefined}
              onSelect={() => void selectPreset("none")}
            >
              <CommandView.ItemIcon><CalendarDaysIcon aria-hidden="true" /></CommandView.ItemIcon>
              <CommandView.ItemLabel>Does not repeat</CommandView.ItemLabel>
              {#if preset === "none"}
                <CheckIcon class="task-repeat-picker__selected" data-ui-part="trailing" aria-hidden="true" />
              {/if}
            </CommandView.Item>
            {#each presentation.options as option (option.value)}
              <CommandView.Item
                value={option.value}
                data-checked={preset === option.value}
                aria-current={preset === option.value ? "true" : undefined}
                onSelect={() => void selectPreset(option.value)}
              >
                <CommandView.ItemIcon><Repeat2Icon aria-hidden="true" /></CommandView.ItemIcon>
                <CommandView.ItemLabel>
                  {option.label}
                  {#if option.context}
                    <span class="task-repeat-picker__option-context">{option.context}</span>
                  {/if}
                </CommandView.ItemLabel>
                {#if preset === option.value}
                  <CheckIcon class="task-repeat-picker__selected" data-ui-part="trailing" aria-hidden="true" />
                {/if}
              </CommandView.Item>
            {/each}
            <CommandView.Item
              value="custom"
              data-checked={preset === "custom"}
              aria-current={preset === "custom" ? "true" : undefined}
              onSelect={() => (custom = true)}
            >
              <CommandView.ItemIcon><Repeat2Icon aria-hidden="true" /></CommandView.ItemIcon>
              <CommandView.ItemLabel>Repeat every…</CommandView.ItemLabel>
              {#if preset === "custom"}
                <CheckIcon class="task-repeat-picker__selected" data-ui-part="trailing" aria-hidden="true" />
              {/if}
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
                  <Select.Item value="daily" label="Days">Days</Select.Item>
                  <Select.Item value="weekly" label="Weeks">Weeks</Select.Item>
                  <Select.Item value="monthly" label="Months">Months</Select.Item>
                  <Select.Item value="yearly" label="Years">Years</Select.Item>
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
