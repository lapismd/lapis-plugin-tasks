<script lang="ts">
  import { untrack } from "svelte";
  import type { ApplicationTask } from "../../model";
  import { noop } from "../story-fixture";
  import ApplicationTaskPreviewRow from "./ApplicationTaskPreviewRow.svelte";

  let {
    expandedByDefault = false,
    recurringByDefault = false,
  }: {
    expandedByDefault?: boolean;
    recurringByDefault?: boolean;
  } = $props();

  let task = $state<ApplicationTask>({
    id: "task-1",
    body: "Tailor platform CV variant",
    done: false,
    status: "todo",
    dueAt: "2026-07-02",
    repeat: untrack(() => recurringByDefault)
      ? {
          strategy: "rolling",
          frequency: "daily",
          interval: 2,
          anchor: "completion",
          lastCompletedAt: "2026-08-18T09:15:00.000Z",
          completionCount: 4,
        }
      : undefined,
  });
  let expanded = $state(false);
  const now = new Date("2026-08-21T10:00:00");

  function updateTask(_taskId: string, patch: Partial<ApplicationTask>) {
    task = {
      ...task,
      ...patch,
    };
  }
</script>

<div class="task-story-frame task-story-frame--xl">
  <ApplicationTaskPreviewRow
    {task}
    {now}
    isExpanded={expandedByDefault || expanded}
    taskIndex={0}
    taskTotal={2}
    onToggleDone={noop}
    onUpdateTask={updateTask}
    onRequestOpen={(_taskId, source) => {
      if (source === "inline") expanded = !expanded;
    }}
    areaOptions={["Applications", "Docs", "CV"]}
  />
  <output data-testid="task-preview-state" hidden>{JSON.stringify(task)}</output>
</div>
