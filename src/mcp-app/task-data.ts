import type {
  ApplicationPlannerTaskRow,
  ApplicationTaskSidebarDetail,
  TaskTrackingCompletionPrompt,
} from "../lib/tasks";
import type { ComponentProps } from "svelte";
import { z } from "zod";

export const listInput = z.object({
  vault_id: z.uuid(),
  view: z.string().optional(),
  today: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const status = z.enum(["open", "completed", "canceled"]);
const priority = z.enum(["low", "medium", "high"]);
export const planKind = z.enum([
  "anytime",
  "morning",
  "afternoon",
  "evening",
  "time",
]);
const row = z.object({
  kind: z.string(),
  documentId: z.string(),
  documentPath: z.string(),
  title: z.string(),
  status,
  deadline: z.string().nullish(),
  priority: priority.nullish(),
  planDate: z.string().nullish(),
  planKind: planKind.nullish(),
  planTime: z.string().nullish(),
  checklistTotal: z.number().optional(),
  checklistCompleted: z.number().optional(),
});
export const listResult = z.object({
  items: z.array(row).max(100),
  truncated: z.boolean(),
});

const plan = z.object({
  date: z.string(),
  at: planKind,
  time: z.string().nullish(),
  duration: z.string().nullish(),
  durationMinutes: z.number().nullish(),
});
const tracking = z.discriminatedUnion("type", [
  z.object({ type: z.literal("boolean") }),
  z.object({
    type: z.literal("count"),
    unit: z.string(),
    target: z.number().optional(),
  }),
  z.object({
    type: z.literal("number"),
    unit: z.string(),
    target: z.number().optional(),
  }),
  z.object({ type: z.literal("duration"), target: z.string().optional() }),
]);
export const savedTask = z.object({
  snapshot: z.object({ path: z.string(), version: z.string() }),
  task: z.object({
    id: z.string(),
    path: z.string(),
    title: z.string(),
    kind: z.literal("task"),
    tags: z.array(z.string()),
    body: z.string(),
    checklist: z
      .array(
        z.object({
          text: z.string(),
          checked: z.boolean(),
          position: z.number(),
          sourceStart: z.number(),
          sourceEnd: z.number(),
          source: z.string(),
        }),
      )
      .default([]),
    created: z.string().optional(),
    updated: z.string().optional(),
    task: z.object({
      status,
      inbox: z.boolean().optional(),
      deadline: z.string().nullish(),
      priority: priority.nullish(),
      start: z
        .discriminatedUnion("kind", [
          z.object({ kind: z.literal("anytime") }),
          z.object({ kind: z.literal("someday") }),
          z.object({ kind: z.literal("date"), date: z.string() }),
        ])
        .nullish(),
      completedAt: z.string().nullish(),
      comments: z
        .array(
          z.object({
            id: z.string(),
            at: z.string(),
            text: z.string(),
            occurrence: z.string().optional(),
            editedAt: z.string().optional(),
            resolved: z.boolean().optional(),
          }),
        )
        .default([]),
      plan: plan.nullish(),
      tracking: tracking.nullish(),
    }),
  }),
});

export const completionResult = z.object({
  operation: z
    .object({
      request_id: z.uuid(),
      path: z.string(),
      disposition: z.enum(["completed", "retryable", "divergent"]),
    })
    .nullable(),
});

export const writeResult = z.object({ kind: z.literal("snapshot") });
export const allowedTools = z.array(z.string());
export type ListedTask = z.infer<typeof row>;
export type SavedTask = z.infer<typeof savedTask>;

export function plannerTask(
  task: ListedTask,
): ComponentProps<typeof ApplicationPlannerTaskRow>["task"] {
  return {
    id: task.documentId,
    title: task.title,
    status: task.status,
    dueAt: task.deadline ?? undefined,
    priority: task.priority ?? undefined,
    scheduledAt: task.planDate ?? undefined,
    planDate: task.planDate ?? undefined,
    planAt:
      (task.planKind === "time" ? task.planTime : task.planKind) ?? undefined,
    checklistTotal: task.checklistTotal,
    checklistCompleted: task.checklistCompleted,
    sourcePath: task.documentPath,
    areas: [],
    tags: [],
    notes: "",
    createdAt: "",
    updatedAt: "",
  };
}

// The planner row does not expose a read-only setting for its checkboxes.
// Disable native inputs without replacing the plugin's controls or styling.
export function checkboxPermissions(
  node: HTMLLIElement,
  completionEnabled: boolean,
) {
  function updateInputs() {
    const completion = node.querySelector<HTMLInputElement>(
      "input[data-task-checkbox-state]",
    );
    if (completion) completion.disabled = !completionEnabled;
    for (const item of node.querySelectorAll<HTMLInputElement>(
      "[data-task-checklist-progress] input[type=checkbox]",
    )) {
      item.disabled = true;
    }
  }
  const observer = new MutationObserver(updateInputs);
  observer.observe(node, { childList: true, subtree: true });
  updateInputs();
  return {
    update(enabled: boolean) {
      completionEnabled = enabled;
      updateInputs();
    },
    destroy() {
      observer.disconnect();
    },
  };
}

export function sidebarTask(
  saved: SavedTask,
): ComponentProps<typeof ApplicationTaskSidebarDetail>["task"] {
  const { task, title, id, body, path, tags, created, updated } = saved.task;
  return {
    id,
    title,
    notes: body,
    sourcePath: path,
    status: task.status,
    completedAt: task.completedAt ?? undefined,
    priority: task.priority ?? undefined,
    inbox: task.inbox,
    deadline: task.deadline ?? undefined,
    dueAt: task.deadline ?? undefined,
    start: task.start?.kind === "date" ? task.start.date : task.start?.kind,
    scheduledAt: task.plan?.date,
    planDate: task.plan?.date,
    planAt:
      (task.plan?.at === "time" ? task.plan.time : task.plan?.at) ?? undefined,
    tracking: task.tracking ?? undefined,
    areas: [],
    tags,
    createdAt: created ?? "",
    updatedAt: updated ?? "",
  };
}

export function promptTask(
  saved: SavedTask,
): ComponentProps<typeof TaskTrackingCompletionPrompt>["task"] {
  return sidebarTask(saved);
}

export function localDate(at: Date): string {
  return [at.getFullYear(), at.getMonth() + 1, at.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
}

// getRandomValues also works in opaque-origin iframes without a secure context.
export function invocationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
