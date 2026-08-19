<script lang="ts">
  import type { ApplicationTask } from "../../model";
  import { noop } from "../story-fixture";
  import ApplicationTaskPreviewRow from "./ApplicationTaskPreviewRow.svelte";

  let task = $state<ApplicationTask>({
    id: "task-1",
    body: "Tailor platform CV variant",
    done: false,
    status: "todo",
    dueAt: "2026-07-02",
  });

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
    taskIndex={0}
    taskTotal={2}
    onToggleDone={noop}
    onUpdateTask={updateTask}
  />
</div>
