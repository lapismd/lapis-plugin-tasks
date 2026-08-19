<script lang="ts">
  import {
    resolveTaskPlannerPlacement,
    type TaskPlannerPlacement,
    type TaskWhen,
  } from "../../model";

  import ApplicationTaskWhenPicker from "../application-task-when-picker/ApplicationTaskWhenPicker.svelte";

  type PickerMode = "schedule" | "due";
  type PickerVariant = "default" | "pill" | "footer";

  type TaskWhenValue = {
    scheduledAt?: string;
    when?: TaskWhen;
  };

  let {
    mode = "schedule",
    variant = mode === "due" ? "pill" : "default",
    value = mode === "due" ? null : {},
    update,
    pickerId = undefined,
  }: {
    mode?: PickerMode;
    variant?: PickerVariant;
    // Dual-mode field: schedule uses TaskWhenValue; due uses string | null.
    // `any` keeps FormCustomRenderer assignability under both shapes.
    value?: any;
    update: (value: any) => void | Promise<void>;
    pickerId?: string;
  } = $props();

  const isDueMode = $derived(mode === "due");
  const scheduleValue = $derived(
    (isDueMode ? {} : ((value as TaskWhenValue | null | undefined) ?? {})) as TaskWhenValue,
  );
  const dueValue = $derived(
    isDueMode ? ((value as string | null | undefined) ?? null) : null,
  );

  function selectPlacement(
    placement: Extract<
      TaskPlannerPlacement,
      "today" | "this-evening" | "anytime" | "someday"
    >,
  ) {
    const patch = resolveTaskPlannerPlacement(placement);
    void update({
      scheduledAt: patch.scheduledAt ?? undefined,
      when: patch.when ?? undefined,
    });
  }
</script>

{#if isDueMode}
  <ApplicationTaskWhenPicker
    mode="due"
    {variant}
    {pickerId}
    scheduledAt={dueValue}
    onSelectDate={(date) => void update(date)}
    onClear={() => void update(null)}
  />
{:else}
  <ApplicationTaskWhenPicker
    mode="schedule"
    {variant}
    {pickerId}
    scheduledAt={scheduleValue.scheduledAt}
    when={scheduleValue.when}
    onSelectDate={(date) => void update({ scheduledAt: date, when: undefined })}
    onSelectPlacement={selectPlacement}
    onClear={() => void update({ scheduledAt: undefined, when: undefined })}
  />
{/if}
