<script lang="ts">
  import {
    normalizeTaskDateOnly,
    resolveTaskPlannerPlacement,
    type ApplicationTask,
    type TaskRepeat,
  } from "../../model";
  import ApplicationTaskRepeatPicker from "../application-task-repeat-picker/ApplicationTaskRepeatPicker.svelte";

  let {
    value,
    update,
    now = undefined,
  }: {
    value: ApplicationTask;
    update: (task: ApplicationTask) => void | Promise<void>;
    now?: Date;
  } = $props();

  function selectRepeat(repeat: TaskRepeat | undefined) {
    if (
      repeat &&
      !normalizeTaskDateOnly(value.planDate ?? value.scheduledAt)
    ) {
      const placement = resolveTaskPlannerPlacement("today", now ?? new Date(), value);
      void update({
        ...value,
        scheduledAt: placement.scheduledAt ?? undefined,
        when: placement.when ?? undefined,
        start: placement.start ?? undefined,
        planDate: placement.planDate ?? undefined,
        planAt: placement.planAt ?? undefined,
        repeat,
      });
      return;
    }
    void update({ ...value, repeat });
  }
</script>

<ApplicationTaskRepeatPicker
  repeat={value.repeat}
  plannedDate={value.planDate ?? value.scheduledAt}
  {now}
  onSelect={selectRepeat}
/>
