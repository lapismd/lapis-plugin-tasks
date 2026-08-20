import type { Task } from "./model/types";
import type {
  TaskListItemsEntry,
  TaskListItemsSection,
} from "./model/task-list-items";

export type TasksListSurfaceController = {
  kind: "tasks-list";
  onActiveTaskChange?: (taskId: string | null) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  onOpenNote?: (path: string) => void | Promise<void>;
  onCreateInSection?: (
    section: TaskListItemsSection,
    title: string,
  ) => void | Promise<void>;
  onReorderSection?: (
    section: TaskListItemsSection,
    entries: TaskListItemsEntry[],
  ) => void | Promise<void>;
  activeTaskId?: string | null;
  tasks?: Task[];
};

export function asTasksListSurfaceController(
  value: unknown,
): TasksListSurfaceController | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TasksListSurfaceController>;
  return candidate.kind === "tasks-list"
    ? (candidate as TasksListSurfaceController)
    : null;
}
