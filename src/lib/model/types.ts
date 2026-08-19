/**
 * Internal compatibility model for the pinned CV reference catalog.
 * Legacy applicationId and linkedTo fields intentionally stop at this boundary.
 */
export const TASK_SCHEMA_VERSION = "cvstudio.tasks.v1";

export type TaskStatus = "todo" | "waiting" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskWhen = "today" | "this-evening" | "anytime" | "someday";
export type TaskBucket =
  | "today"
  | "upcoming"
  | "anytime"
  | "someday"
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
  areas?: string[];
  tags?: string[];
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  order?: number;
  todayOrder?: number;
  areaOrder?: number;
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
  notes?: string;
  order?: number;
};
