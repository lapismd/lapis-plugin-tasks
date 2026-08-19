<script lang="ts">
  import type { ApplicationTask, Task } from "../../model";
  import { noop, samplePlannerTasks } from "../story-fixture";
  import ApplicationPlannerTaskRow from "./ApplicationPlannerTaskRow.svelte";

  let task = $state<Task>(samplePlannerTasks()[0]!);

  function updateTask(_task: Task, patch: Partial<ApplicationTask>) {
    task = {
      ...task,
      title: patch.body ?? task.title,
      status: patch.status ?? task.status,
      dueAt: Object.prototype.hasOwnProperty.call(patch, "dueAt")
        ? patch.dueAt
        : task.dueAt,
      areas: patch.areas ?? task.areas,
      notes: Object.prototype.hasOwnProperty.call(patch, "notes")
        ? (patch.notes ?? "")
        : task.notes,
      updatedAt: new Date().toISOString(),
    };
  }
</script>

<div class="task-story-frame task-story-frame--xl">
  <ApplicationPlannerTaskRow
    {task}
    application={{ title: "Nova Bank", subtitle: "Staff Platform Engineer" }}
    taskIndex={0}
    taskTotal={3}
    onOpenApplication={noop}
    onUpdateTask={updateTask}
  />
</div>
