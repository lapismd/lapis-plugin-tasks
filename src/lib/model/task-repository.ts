import type {
  AppDatabase,
  AppDatabaseTaskRecord,
} from "@lapis-notes/api/app-database";
import {
  PUBLIC_TASKS_PROJECTION_ID,
  taskQueryToIndexQuery,
} from "@lapis-notes/api/app-database";
import {
  parseTaskDocument,
  serializeTaskDocument,
  type ParsedTaskFile,
  type TaskPlan,
  type TaskStart,
} from "./task-document";
import {
  completeTaskDocument,
  planTaskDocument,
  setReservedLinks,
  setTaskDeadline,
  setTaskInbox,
  setTaskStart,
  skipOccurrence,
} from "./task-mutations";
import { indexTaskDocument } from "./task-index";
import { projectTask } from "./task-projection";
import type { TaskSummary, TaskView } from "./task-queries";

export type TaskFileStore = {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
};

export function createMemoryTaskFileStore(
  files: Record<string, string> = {},
): TaskFileStore {
  const store = new Map(Object.entries(files));
  return {
    async read(path) {
      const raw = store.get(path);
      if (raw == null) throw new Error(`Missing task file: ${path}`);
      return raw;
    },
    async write(path, content) {
      store.set(path, content);
    },
  };
}

export function taskRowToSummary(row: AppDatabaseTaskRecord): TaskSummary {
  return {
    id: row.documentId,
    path: row.documentPath,
    title: row.title,
    kind: row.kind,
    status: row.status,
    inbox: row.inbox,
    startKind: row.startKind,
    startDate: row.startDate ?? undefined,
    planDate: row.planDate ?? undefined,
    planKind: row.planKind ?? undefined,
    planTime: row.planTime ?? undefined,
    durationMinutes: row.durationMinutes ?? undefined,
    deadline: row.deadline ?? undefined,
    completedAt: row.completedAt ?? undefined,
    checklistTotal: row.checklistTotal,
    checklistCompleted: row.checklistCompleted,
    commentCount: row.commentCount,
  };
}

export class TaskRepository {
  constructor(
    private readonly database: AppDatabase,
    private readonly files?: TaskFileStore,
  ) {}

  async get(id: string): Promise<TaskSummary | null> {
    const row =
      (await this.database.getProjectionRow<AppDatabaseTaskRecord>(
        PUBLIC_TASKS_PROJECTION_ID,
        id,
      )) ?? (await this.database.getTaskRow({ id }));
    return row ? taskRowToSummary(row) : null;
  }

  async inbox(today?: string): Promise<TaskSummary[]> {
    return this.query("inbox", today);
  }

  async today(today: string): Promise<TaskSummary[]> {
    return this.query("today", today);
  }

  async anytime(today: string): Promise<TaskSummary[]> {
    return this.query("anytime", today);
  }

  async upcoming(today: string): Promise<TaskSummary[]> {
    return this.query("upcoming", today);
  }

  async someday(): Promise<TaskSummary[]> {
    return this.query("someday");
  }

  async review(today: string): Promise<TaskSummary[]> {
    return this.query("review", today);
  }

  async completed(): Promise<TaskSummary[]> {
    return this.query("completed");
  }

  async lists(): Promise<TaskSummary[]> {
    const result = await this.database.queryProjection<AppDatabaseTaskRecord>(
      PUBLIC_TASKS_PROJECTION_ID,
      taskQueryToIndexQuery({ kind: "task-list" }),
    );
    return result.rows.map(taskRowToSummary);
  }

  async children(idOrPath: string): Promise<TaskSummary[]> {
    return this.related(idOrPath, "subtask");
  }

  async items(idOrPath: string): Promise<TaskSummary[]> {
    return this.related(idOrPath, "list-item");
  }

  async parent(idOrPath: string): Promise<TaskSummary | null> {
    const rowId = await this.resolveRowId(idOrPath);
    if (!rowId) return null;
    for (const relation of ["subtask", "list-item"] as const) {
      const result = await this.database.queryRelated<AppDatabaseTaskRecord>({
        projectionId: PUBLIC_TASKS_PROJECTION_ID,
        rowId,
        relation,
        direction: "in",
        limit: 1,
      });
      if (result.rows[0]) return taskRowToSummary(result.rows[0]);
    }
    return null;
  }

  async complete(path: string, at: string): Promise<TaskSummary> {
    return this.mutate(path, (document) => completeTaskDocument(document, at));
  }

  async skip(path: string, at: string): Promise<TaskSummary> {
    return this.mutate(path, (document) => skipOccurrence(document, at));
  }

  async planFor(
    path: string,
    plan: TaskPlan | undefined,
    at: string,
  ): Promise<TaskSummary> {
    return this.mutate(path, (document) => planTaskDocument(document, plan, at));
  }

  async setStart(
    path: string,
    start: TaskStart,
    at: string,
  ): Promise<TaskSummary> {
    return this.mutate(path, (document) => setTaskStart(document, start, at));
  }

  async setDeadline(
    path: string,
    deadline: string | undefined,
    at: string,
  ): Promise<TaskSummary> {
    return this.mutate(path, (document) =>
      setTaskDeadline(document, deadline, at),
    );
  }

  async setInbox(
    path: string,
    inbox: boolean,
    at: string,
  ): Promise<TaskSummary> {
    return this.mutate(path, (document) => setTaskInbox(document, inbox, at));
  }

  async moveToList(
    childPath: string,
    listPath: string | null,
    at: string,
  ): Promise<TaskSummary> {
    const child = await this.loadDocument(childPath);
    const currentParent = await this.parent(childPath);
    if (currentParent && currentParent.path !== listPath) {
      await this.replaceListItem(currentParent.path, childPath, null, at);
    }
    if (listPath) {
      await this.replaceListItem(listPath, childPath, child, at);
    }
    return taskRowToSummary(projectTask(child));
  }

  private async replaceListItem(
    listPath: string,
    childPath: string,
    child: ParsedTaskFile | null,
    at: string,
  ): Promise<void> {
    const list = await this.loadDocument(listPath);
    const nextLinks = list.structuralLinks
      .filter((link) => link.kind === "list-item")
      .filter((link) => link.href !== childPath && !link.href.endsWith(`/${childPath}`))
      .map((link) => ({ title: link.title, href: link.href }));
    if (child) {
      nextLinks.push({ title: child.title, href: childPath });
    }
    const next = {
      ...setReservedLinks(list, "Items", nextLinks),
      updated: at,
    };
    await this.writeDocument(next);
  }

  private async mutate(
    path: string,
    mutate: (document: ParsedTaskFile) => ParsedTaskFile,
  ): Promise<TaskSummary> {
    const next = mutate(await this.loadDocument(path));
    await this.writeDocument(next);
    return taskRowToSummary(projectTask(next));
  }

  private async loadDocument(path: string): Promise<ParsedTaskFile> {
    if (!this.files) {
      throw new Error("TaskRepository mutations require a file store.");
    }
    const raw = await this.files.read(path);
    const parsed = parseTaskDocument(raw, path);
    if (!parsed) throw new Error(`Not a task document: ${path}`);
    return parsed;
  }

  private async writeDocument(document: ParsedTaskFile): Promise<void> {
    if (!this.files) {
      throw new Error("TaskRepository mutations require a file store.");
    }
    const serialized = serializeTaskDocument(document);
    const next = parseTaskDocument(serialized, document.path) ?? document;
    await this.files.write(document.path, serialized);
    await indexTaskDocument(this.database, { ...next, raw: serialized });
  }

  private async resolvePath(idOrPath: string): Promise<string | null> {
    const byPath = await this.database.getTaskRow({ path: idOrPath });
    if (byPath) return byPath.documentPath;
    const byId = await this.database.getTaskRow({ id: idOrPath });
    return byId?.documentPath ?? null;
  }

  private async related(
    idOrPath: string,
    relation: "subtask" | "list-item",
  ): Promise<TaskSummary[]> {
    const rowId = await this.resolveRowId(idOrPath);
    if (!rowId) return [];
    const result = await this.database.queryRelated<AppDatabaseTaskRecord>({
      projectionId: PUBLIC_TASKS_PROJECTION_ID,
      rowId,
      relation,
    });
    return result.rows.map(taskRowToSummary);
  }

  private async resolveRowId(idOrPath: string): Promise<string | null> {
    const byId = await this.database.getProjectionRow<AppDatabaseTaskRecord>(
      PUBLIC_TASKS_PROJECTION_ID,
      idOrPath,
    );
    if (byId) return byId.documentId;
    const byPath = await this.database.getTaskRow({ path: idOrPath });
    return byPath?.documentId ?? null;
  }

  private async query(view: TaskView, today?: string): Promise<TaskSummary[]> {
    const result = await this.database.queryProjection<AppDatabaseTaskRecord>(
      PUBLIC_TASKS_PROJECTION_ID,
      taskQueryToIndexQuery({ view, today }),
    );
    return result.rows.map(taskRowToSummary);
  }
}
