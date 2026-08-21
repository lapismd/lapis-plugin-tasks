<script lang="ts">
  import {
    normalizeTaskDateOnly,
    nextRecurrenceDate,
    resolveTaskPlannerPlacement,
    todayDateOnly,
    type ApplicationTask,
    type LocalDateString,
    type TaskRepeat,
    type TaskTracking,
  } from "../../model";
  import ApplicationTaskRepeatPicker from "../application-task-repeat-picker/ApplicationTaskRepeatPicker.svelte";

  let {
    value,
    update,
    now = undefined,
    variant = "default",
  }: {
    value: ApplicationTask;
    update: (task: ApplicationTask) => void | Promise<void>;
    now?: Date;
    variant?: "default" | "chip";
  } = $props();

  function selectRepeat(
    repeat: TaskRepeat | undefined,
    tracking: TaskTracking | undefined,
  ) {
    const base = {
      ...value,
      repeat,
      tracking: repeat ? tracking : undefined,
      unparsedRepeat: undefined,
    };
    if (value.repeat?.paused && repeat && !repeat.paused && repeat.start) {
      const resumedOn = todayDateOnly(now ?? new Date());
      const nextDate = nextRecurrenceDate(
        repeat,
        resumedOn as LocalDateString,
        true,
      );
      void update({
        ...base,
        scheduledAt: nextDate ?? undefined,
        planDate: nextDate ?? undefined,
        planAt: value.planAt ?? "anytime",
      });
      return;
    }
    if (
      repeat?.anchor === "schedule" &&
      !normalizeTaskDateOnly(value.planDate ?? value.scheduledAt)
    ) {
      const placement = resolveTaskPlannerPlacement("today", now ?? new Date(), value);
      void update({
        ...base,
        scheduledAt: placement.scheduledAt ?? undefined,
        when: placement.when ?? undefined,
        start: placement.start ?? undefined,
        planDate: placement.planDate ?? undefined,
        planAt: placement.planAt ?? undefined,
      });
      return;
    }
    void update(base);
  }
</script>

<ApplicationTaskRepeatPicker
  repeat={value.repeat}
  tracking={value.tracking}
  invalidRepeat={value.unparsedRepeat}
  plannedDate={value.planDate ?? value.scheduledAt}
  {now}
  {variant}
  onSelect={selectRepeat}
/>
