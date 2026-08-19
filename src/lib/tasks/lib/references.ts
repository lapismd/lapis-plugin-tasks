import {
  formatTaskReference,
  markDuplicateReferenceTargets,
  referenceAnchorId,
  type ReferenceIndex,
  type ReferencePreviewItem,
  type ReferenceTarget,
} from "@lapismd/design-core/forms";
import type { JobApplication } from '../../model';

function compact(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function taskStatusLabel(task: NonNullable<JobApplication["tasks"]>[number]) {
  if (task.done || task.status === "done" || task.completedAt) return "Done";
  if (task.status === "waiting") return "Waiting";
  return "Todo";
}

function isTaskDone(task: NonNullable<JobApplication["tasks"]>[number]) {
  return task.done || task.status === "done" || Boolean(task.completedAt);
}

function taskOptionStatus(
  task: NonNullable<JobApplication["tasks"]>[number],
): "todo" | "waiting" | undefined {
  if (isTaskDone(task)) return undefined;
  return task.status === "waiting" ? "waiting" : "todo";
}

function taskExcerpt(task: NonNullable<JobApplication["tasks"]>[number]) {
  return [
    taskStatusLabel(task),
    task.dueAt ? `Due ${task.dueAt}` : "",
    task.priority ? `Priority ${task.priority}` : "",
    task.linkedTo?.stageId ? `Stage ${task.linkedTo.stageId}` : "",
    task.linkedTo?.type ? `Linked to ${task.linkedTo.type}` : "",
  ]
    .filter(Boolean)
    .join(" - ");
}

function taskHref(applicationId: string, ref: string) {
  const params = new URLSearchParams({ workspace: "roles", app: applicationId });
  return `/?${params.toString()}#${referenceAnchorId(ref)}`;
}

function taskPreviewItems(
  task: NonNullable<JobApplication["tasks"]>[number],
): ReferencePreviewItem[] {
  const items: ReferencePreviewItem[] = [
    { kind: "row", label: "ID", value: task.id, highlighted: true },
    { kind: "row", label: "Task", value: compact(task.body) },
    { kind: "row", label: "Status", value: taskStatusLabel(task) },
    { kind: "row", label: "Due", value: task.dueAt ?? "" },
    { kind: "row", label: "Priority", value: task.priority ?? "" },
    { kind: "row", label: "Notes", value: task.notes ?? "" },
  ];
  return items.filter(
    (item) => item.kind === "list" || item.value || item.highlighted,
  );
}

export function buildApplicationTaskReferenceIndex(
  application: JobApplication,
): ReferenceIndex {
  const references: ReferenceTarget[] = (application.tasks ?? []).map(
    (task, index) => {
      const ref = formatTaskReference(application.id, task.id);
      const path = `/tasks/${index}`;
      return {
        id: task.id,
        ref,
        marker: ref,
        path,
        type: "Task",
        kind: "task",
        label: compact(task.body) || task.id,
        excerpt: [
          taskExcerpt(task),
          compact(task.notes),
        ]
          .filter(Boolean)
          .join(" - "),
        duplicate: false,
        selectable: !isTaskDone(task),
        optionNotes: compact(task.notes) || undefined,
        optionStatus: taskOptionStatus(task),
        href: taskHref(application.id, ref),
        preview: {
          title: compact(task.body) || task.id,
          meta: path,
          items: taskPreviewItems(task),
        },
      };
    },
  );
  return markDuplicateReferenceTargets(references);
}
