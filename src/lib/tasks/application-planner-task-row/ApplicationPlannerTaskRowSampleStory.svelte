<script lang="ts">
  import type { ApplicationTask, Task } from "../../model";
  import { noop, samplePlannerTasks } from "../story-fixture";
  import ApplicationPlannerTaskRow from "./ApplicationPlannerTaskRow.svelte";

  const baseTask =
    samplePlannerTasks().find((candidate) => candidate.id === "story-task-daily-reflection") ??
    samplePlannerTasks()[0]!;
  const areaOptions = [
    {
      id: "list-applications",
      title: "Applications",
      path: "lists/applications.md",
    },
  ];
  const storyNow = new Date(2026, 7, 19, 9, 0, 0);
  let task = $state<Task>({
    ...baseTask,
    dueAt: baseTask.dueAt ?? "2026-08-19",
    deadline: baseTask.deadline ?? "2026-08-19",
    listId: "list-applications",
    areas: ["Applications"],
  });

  function updateTask(_task: Task, patch: Partial<ApplicationTask>) {
    task = {
      ...task,
      title: patch.body ?? task.title,
      status: patch.status ?? task.status,
      dueAt: Object.prototype.hasOwnProperty.call(patch, "dueAt")
        ? patch.dueAt
        : task.dueAt,
      deadline: Object.prototype.hasOwnProperty.call(patch, "deadline")
        ? patch.deadline
        : task.deadline,
      scheduledAt: Object.prototype.hasOwnProperty.call(patch, "scheduledAt")
        ? patch.scheduledAt
        : task.scheduledAt,
      when: Object.prototype.hasOwnProperty.call(patch, "when")
        ? patch.when
        : task.when,
      start: Object.prototype.hasOwnProperty.call(patch, "start")
        ? patch.start
        : task.start,
      planDate: Object.prototype.hasOwnProperty.call(patch, "planDate")
        ? patch.planDate
        : task.planDate,
      planAt: Object.prototype.hasOwnProperty.call(patch, "planAt")
        ? patch.planAt
        : task.planAt,
      areas: patch.areas ?? task.areas,
      listId: Object.prototype.hasOwnProperty.call(patch, "listId")
        ? patch.listId
        : task.listId,
      repeat: Object.prototype.hasOwnProperty.call(patch, "repeat")
        ? patch.repeat
        : task.repeat,
      unparsedRepeat: Object.prototype.hasOwnProperty.call(
        patch,
        "unparsedRepeat",
      )
        ? patch.unparsedRepeat
        : task.unparsedRepeat,
      tracking: Object.prototype.hasOwnProperty.call(patch, "tracking")
        ? patch.tracking
        : task.tracking,
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
    areaOptions={areaOptions}
    now={storyNow}
    onOpenApplication={noop}
    onUpdateTask={updateTask}
  />
</div>
