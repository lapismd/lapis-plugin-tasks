import type { Task, TaskQuickCreateInput } from "./model/types";
import type {
  StructuralTaskRun,
  StructuralTaskRunEntryInput,
} from "./model/task-list-items";

export type TasksMarkdownSurfaceController = {
  kind: "tasks-markdown";
  onActiveTaskChange?: (taskId: string | null) => void | Promise<void>;
  onActiveListChange?: (path: string | null) => void | Promise<void>;
  onOpenList?: (path: string, title: string) => void | Promise<void>;
  onSaveTask?: (task: Task) => void | Promise<void>;
  onDeleteTask?: (task: Task) => void | Promise<void>;
  onDeleteList?: (
    path: string,
    parentPath: string,
  ) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  onOpenNote?: (path: string) => void | Promise<void>;
  onRevealSource?: (
    section: StructuralTaskRun,
  ) => void | Promise<void>;
  onCreateInSection?: (
    section: StructuralTaskRun,
    input: TaskQuickCreateInput,
  ) =>
    | StructuralTaskRunEntryInput
    | void
    | Promise<StructuralTaskRunEntryInput | void>;
  onReorderSection?: (
    section: StructuralTaskRun,
    entries: ReadonlyArray<StructuralTaskRunEntryInput>,
  ) => void | Promise<void>;
  onMoveEntry?: (
    source: { documentPath: string; runId: string; index: number },
    target: { run: StructuralTaskRun; index: number },
  ) => void | Promise<void>;
  activeTaskId?: string | null;
  activeListPath?: string | null;
  sourceRunOrdinal?: number | null;
  pageTitle?: string | null;
  hideMatchingDocumentTitle?: boolean;
  tasks?: Task[];
};

/**
 * Rich list rows are resolved from the public task projection, which does not
 * carry parent-list relationships. Merge those fields from the planner's
 * canonical task so an ordinary field edit cannot be mistaken for an explicit
 * request to remove the task from its list without discarding fresher row data.
 */
export function taskForTasksMarkdownMutation(
  task: Task,
  controllerTasks: readonly Task[] | undefined,
): Task {
  const canonical = controllerTasks?.find(
    (candidate) => candidate.id === task.id,
  );
  return canonical
    ? {
        ...task,
        applicationId: canonical.applicationId,
        listId: canonical.listId,
        areas: canonical.areas,
      }
    : task;
}

export function asTasksMarkdownSurfaceController(
  value: unknown,
): TasksMarkdownSurfaceController | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<TasksMarkdownSurfaceController>;
  return candidate.kind === "tasks-markdown"
    ? (candidate as TasksMarkdownSurfaceController)
    : null;
}
