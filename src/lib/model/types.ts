/**
 * Catalog compatibility model. Canonical Markdown documents live in
 * `task-document.ts`. Legacy applicationId and linkedTo fields stay fixture-only.
 */
export const TASK_SCHEMA_VERSION = "tasks/v1";

export type TaskStatus = "todo" | "waiting" | "done" | "open" | "completed" | "canceled";
export type TaskPriority = "low" | "medium" | "high";
export type TaskWhen = "today" | "this-evening" | "anytime" | "someday";
export type TaskCatalogPlanAt =
  | "anytime"
  | "morning"
  | "afternoon"
  | "evening"
  | string;
export type TaskBucket =
  | "inbox"
  | "today"
  | "upcoming"
  | "anytime"
  | "someday"
  | "review"
  | "logbook";

export type TaskLink = {
  type:
    | "stage"
    | "question"
    | "employer_question"
    | "story"
    | "gap"
    | "application"
    | "docs_note"
    | "docs_card"
    | "other";
  ref: string;
  stageId?: string;
  notes?: string;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  applicationId?: string;
  linkedTo?: TaskLink;
  dueAt?: string;
  scheduledAt?: string;
  when?: TaskWhen;
  inbox?: boolean;
  start?: "anytime" | "someday" | string;
  planDate?: string;
  planAt?: TaskCatalogPlanAt;
  planDuration?: string;
  deadline?: string;
  listId?: string;
  areas: string[];
  tags: string[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  order?: number;
  todayOrder?: number;
  areaOrder?: number;
  sourcePath?: string;
  notes: string;
};

export type TaskMarkdownFile = {
  path: string;
  content: string;
};

export type CreateTaskInput = {
  id?: string;
  title: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  applicationId?: string;
  linkedTo?: TaskLink;
  dueAt?: string;
  scheduledAt?: string;
  when?: TaskWhen;
  inbox?: boolean;
  start?: "anytime" | "someday" | string;
  planDate?: string;
  planAt?: TaskCatalogPlanAt;
  planDuration?: string;
  deadline?: string;
  listId?: string;
  areas?: string[];
  tags?: string[];
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  order?: number;
  todayOrder?: number;
  areaOrder?: number;
  sourcePath?: string;
  notes?: string;
};

export type TaskQuickCreateInput = {
  title: string;
  view: TaskBucket;
  area?: string | null;
  dueAt?: string;
  priority?: TaskPriority;
  scheduledAt?: string;
  when?: TaskWhen;
  order: number;
  planAt?: TaskCatalogPlanAt;
};

export type ApplicationTaskAdapter = {
  id: string;
  body: string;
  done: boolean;
  dueAt?: string;
  scheduledAt?: string;
  when?: TaskWhen;
  status?: TaskStatus;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  priority?: TaskPriority;
  linkedTo?: TaskLink;
  areas?: string[];
  listId?: string;
  start?: "anytime" | "someday" | string;
  planDate?: string;
  planAt?: TaskCatalogPlanAt;
  deadline?: string;
  inbox?: boolean;
  notes?: string;
  order?: number;
};
