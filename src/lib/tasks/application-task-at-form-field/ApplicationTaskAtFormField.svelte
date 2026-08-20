<script lang="ts">
  import type { TaskCatalogPlanAt, TaskPlanAtDayPart, TaskWhen } from "../../model";
  import { resolveTaskPlanAt } from "../../model";

  import ApplicationTaskAtPicker from "../application-task-at-picker/ApplicationTaskAtPicker.svelte";

  type TaskAtValue = {
    scheduledAt?: string;
    when?: TaskWhen;
    start?: "anytime" | "someday" | string;
    planDate?: string;
    planAt?: TaskCatalogPlanAt;
  };

  let {
    value = {},
    update,
    pickerId = undefined,
  }: {
    value?: any;
    update: (value: any) => void | Promise<void>;
    pickerId?: string;
  } = $props();

  const scheduleValue = $derived((value as TaskAtValue | null | undefined) ?? {});

  function selectAt(at: TaskPlanAtDayPart) {
    const patch = resolveTaskPlanAt(at, scheduleValue);
    void update({
      scheduledAt: patch.scheduledAt ?? undefined,
      when: patch.when ?? undefined,
      start: patch.start ?? undefined,
      planDate: patch.planDate ?? undefined,
      planAt: patch.planAt ?? undefined,
    });
  }
</script>

<ApplicationTaskAtPicker
  {pickerId}
  when={scheduleValue.when}
  planAt={scheduleValue.planAt}
  onSelect={selectAt}
/>
