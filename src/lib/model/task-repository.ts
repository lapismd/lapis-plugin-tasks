import type {
  AppDatabase,
  AppDatabaseTaskRecord,
} from "@lapis-notes/api/app-database";
import {
  eq,
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
  reopenTaskDocument,
  setReservedLinks,
  setTaskDeadline,
  setTaskInbox,
  setTaskStart,
  skipOccurrence,
} from "./task-mutations";
import { indexTaskDocument, resolveTaskHref } from "./task-index";
import {
  moveNavigationPin,
  navigationPinHref,
  rewriteNavigationBody,
  TASK_LIST_NAVIGATION_PATH,
  TaskListMutationError,
  type ListTreeDropTarget,
  type NavigationPin,
} from "./list-navigation";
import { projectTask } from "./task-projection";
import type { TaskSummary, TaskView } from "./task-queries";

export type TaskFileStore = {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  remove?(path: string): Promise<void>;
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
    async remove(path) {
      store.delete(path);
    },
  };
}

export function replaceTitleHeading(body: string, title: string): string {
  if (/^#\s+.+/m.test(body)) {
    return body.replace(/^#\s+.+/m, `# ${title}`);
  }
  const trimmed = body.replace(/^\n+/, "");
  return trimmed ? `# ${title}\n\n${trimmed}` : `# ${title}\n`;
}

export function taskRowToSummary(row: AppDatabaseTaskRecord): TaskSummary {
  return {
    id: row.documentId,
    path: row.documentPath,
    title: row.title,
    kind: row.kind as TaskSummary["kind"],
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

  async navigation(): Promise<TaskSummary | null> {
    const rows = await this.navigationDocuments();
    if (!rows.length) return null;
    return (
      rows.find((row) => row.path === TASK_LIST_NAVIGATION_PATH) ??
      rows.slice().sort((left, right) => left.path.localeCompare(right.path))[0] ??
      null
    );
  }

  async navigationDocuments(): Promise<TaskSummary[]> {
    const result = await this.database.queryProjection<AppDatabaseTaskRecord>(
      PUBLIC_TASKS_PROJECTION_ID,
      { where: eq("kind", "task-list-navigation") },
    );
    return result.rows.map(taskRowToSummary);
  }

  async listParents(idOrPath: string): Promise<TaskSummary[]> {
    const rowId = await this.resolveRowId(idOrPath);
    if (!rowId) return [];
    const result = await this.database.queryRelated<AppDatabaseTaskRecord>({
      projectionId: PUBLIC_TASKS_PROJECTION_ID,
      rowId,
      relation: "list-item",
      direction: "in",
    });
    return result.rows.map(taskRowToSummary);
  }

  async listItems(idOrPath: string): Promise<TaskSummary[]> {
    return this.items(idOrPath);
  }

  async listChildren(idOrPath: string): Promise<TaskSummary[]> {
    const rowId = await this.resolveRowId(idOrPath);
    if (!rowId) return [];
    const result = await this.database.queryRelated<AppDatabaseTaskRecord>({
      projectionId: PUBLIC_TASKS_PROJECTION_ID,
      rowId,
      relation: "list-item",
      targetWhere: eq("kind", "task-list"),
    });
    return result.rows.map(taskRowToSummary);
  }

  async navigationPins(): Promise<
    Array<{
      section: string;
      ordinal: number;
      list: TaskSummary;
      ignored: boolean;
    }>
  > {
    const navigation = await this.navigation();
    if (!navigation) return [];
    const document = this.files
      ? await this.loadDocument(navigation.path)
      : null;
    if (!document) return [];
    const pins: Array<{
      section: string;
      ordinal: number;
      list: TaskSummary;
      ignored: boolean;
    }> = [];
    for (const link of document.structuralLinks) {
      if (link.kind !== "navigation-item") continue;
      const targetPath = resolveTaskHref(navigation.path, link.href);
      const list = await this.getByPath(targetPath);
      if (!list || list.kind !== "task-list") continue;
      const parents = await this.listParents(list.id);
      pins.push({
        section: link.heading ?? navigation.title,
        ordinal: link.ordinal,
        list,
        ignored: parents.length > 0,
      });
    }
    return pins;
  }

  async pinnedRoots(): Promise<
    Array<{ section: string; ordinal: number; list: TaskSummary }>
  > {
    return (await this.navigationPins())
      .filter((pin) => !pin.ignored)
      .map(({ ignored: _ignored, ...pin }) => pin);
  }

  async unpinnedRoots(): Promise<TaskSummary[]> {
    const lists = (await this.lists()).filter((list) => list.status === "active");
    const pinned = new Set((await this.pinnedRoots()).map((pin) => pin.list.id));
    const roots: TaskSummary[] = [];
    for (const list of lists) {
      if (pinned.has(list.id)) continue;
      const parents = await this.listParents(list.id);
      if (parents.length) continue;
      roots.push(list);
    }
    return roots.sort((left, right) => left.title.localeCompare(right.title));
  }

  async wouldCreateListCycle(
    movingId: string,
    newParentId: string,
  ): Promise<boolean> {
    if (movingId === newParentId) return true;
    let current: string | null = newParentId;
    const seen = new Set<string>();
    while (current) {
      if (current === movingId) return true;
      if (seen.has(current)) return true;
      seen.add(current);
      const parents = await this.listParents(current);
      current = parents[0]?.id ?? null;
    }
    return false;
  }

  async complete(path: string, at: string): Promise<TaskSummary> {
    return this.mutate(path, (document) => completeTaskDocument(document, at));
  }

  async reopen(path: string, at: string): Promise<TaskSummary> {
    return this.mutate(path, (document) => reopenTaskDocument(document, at));
  }

  async setTitle(
    path: string,
    title: string,
    at: string,
  ): Promise<TaskSummary> {
    return this.mutate(path, (document) => ({
      ...document,
      title,
      updated: at,
      body: replaceTitleHeading(document.body, title),
    }));
  }

  async create(input: {
    path: string;
    title: string;
    at: string;
    id?: string;
    inbox?: boolean;
  }): Promise<TaskSummary> {
    const id =
      input.id ??
      `task-${input.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "untitled"}-${input.at.slice(0, 10)}`;
    const document: ParsedTaskFile = {
      path: input.path,
      raw: "",
      id,
      kind: "task",
      title: input.title,
      tags: [],
      created: input.at,
      updated: input.at,
      task: {
        status: "open",
        inbox: input.inbox ?? true,
        start: { kind: "anytime" },
        comments: [],
      },
      body: `# ${input.title}\n`,
      checklist: [],
      structuralLinks: [],
      diagnostics: [],
    };
    await this.writeDocument(document);
    return taskRowToSummary(projectTask(document));
  }

  async createList(input: {
    path: string;
    title: string;
    at: string;
    id?: string;
    pin?: { section: string };
  }): Promise<TaskSummary> {
    const id =
      input.id ??
      `list-${input.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "untitled"}`;
    const document: ParsedTaskFile = {
      path: input.path,
      raw: "",
      id,
      kind: "task-list",
      title: input.title,
      tags: [],
      created: input.at,
      updated: input.at,
      list: { status: "active" },
      body: `# ${input.title}\n\n## Items\n`,
      structuralLinks: [],
      diagnostics: [],
    };
    await this.writeDocument(document);
    if (input.pin) {
      await this.pinList(input.path, input.pin.section, input.at);
    }
    return taskRowToSummary(projectTask(document));
  }

  async remove(path: string): Promise<void> {
    if (!this.files?.remove) {
      throw new Error("TaskRepository deletions require a file store remove.");
    }
    await this.files.remove(path);
    await this.database.deleteProjectionSource(
      PUBLIC_TASKS_PROJECTION_ID,
      path,
      "tasks",
    );
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

  async pinList(
    listPath: string,
    section: string,
    at: string,
    options?: { beforePath?: string | null },
  ): Promise<void> {
    const list = await this.loadDocument(listPath);
    if (list.kind !== "task-list") {
      throw new TaskListMutationError(
        "not-a-list",
        "Only task-lists can be pinned.",
      );
    }
    const parents = await this.listParents(list.id);
    if (parents.length) {
      throw new TaskListMutationError(
        "ignored-navigation-pin",
        `${list.title} already has a structural list parent.`,
      );
    }
    await this.rewriteNavigationPins((pins, navigationPath) => {
      const href = navigationPinHref(navigationPath, listPath);
      const without = pins.filter(
        (pin) => !this.pinMatches(pin, listPath, navigationPath),
      );
      return moveNavigationPin(
        [...without, { title: list.title, href, section }],
        href,
        { section, beforeHrefOrPath: options?.beforePath ?? null },
      );
    }, at);
  }

  async unpinList(listPath: string, at: string): Promise<void> {
    if (!(await this.navigation())) return;
    await this.rewriteNavigationPins(
      (pins, navigationPath) =>
        pins.filter((pin) => !this.pinMatches(pin, listPath, navigationPath)),
      at,
    );
  }

  async movePinnedRoot(
    listPath: string,
    target: { section: string; beforePath?: string | null },
    at: string,
  ): Promise<void> {
    await this.pinList(listPath, target.section, at, {
      beforePath: target.beforePath,
    });
  }

  async nestList(
    childPath: string,
    parentPath: string,
    at: string,
    options?: { beforePath?: string | null },
  ): Promise<void> {
    const child = await this.loadDocument(childPath);
    const parent = await this.loadDocument(parentPath);
    if (child.kind !== "task-list" || parent.kind !== "task-list") {
      throw new TaskListMutationError(
        "not-a-list",
        "Nesting requires two task-lists.",
      );
    }
    if (await this.wouldCreateListCycle(child.id, parent.id)) {
      throw new TaskListMutationError(
        "list-cycle",
        `Nesting ${child.title} under ${parent.title} would create a cycle.`,
      );
    }
    const parents = await this.listParents(child.id);
    if (parents.length > 1) {
      throw new TaskListMutationError(
        "multiple-list-parents",
        `${child.title} has more than one structural list parent.`,
      );
    }
    const currentParent = parents[0];
    if (currentParent && currentParent.path !== parentPath) {
      await this.replaceListItem(currentParent.path, childPath, null, at);
    }
    await this.unpinList(childPath, at);
    await this.replaceListItem(parentPath, childPath, child, at, options);
  }

  async unnestList(
    childPath: string,
    target: { section: string; beforePath?: string | null },
    at: string,
  ): Promise<void> {
    const parents = await this.listParents(childPath);
    if (parents.length > 1) {
      throw new TaskListMutationError(
        "multiple-list-parents",
        "A list may have only one structural parent.",
      );
    }
    if (parents[0]) {
      await this.replaceListItem(parents[0].path, childPath, null, at);
    }
    await this.pinList(childPath, target.section, at, {
      beforePath: target.beforePath,
    });
  }

  async reorderListItems(
    listPath: string,
    orderedChildPaths: string[],
    at: string,
  ): Promise<void> {
    const list = await this.loadDocument(listPath);
    const current = list.structuralLinks.filter((link) => link.kind === "list-item");
    const next = orderedChildPaths.flatMap((childPath) => {
      const link = current.find((item) =>
        this.linkTargetsPath(listPath, item.href, childPath),
      );
      return link ? [{ title: link.title, href: link.href }] : [];
    });
    for (const link of current) {
      if (
        !orderedChildPaths.some((childPath) =>
          this.linkTargetsPath(listPath, link.href, childPath),
        )
      ) {
        next.push({ title: link.title, href: link.href });
      }
    }
    await this.writeDocument({
      ...setReservedLinks(list, "Items", next),
      updated: at,
    });
  }

  async applyListTreeDrop(
    sourcePath: string,
    target: ListTreeDropTarget,
    at: string,
  ): Promise<void> {
    if (target.kind === "nest") {
      if (sourcePath === target.parentPath) {
        throw new TaskListMutationError(
          "list-cycle",
          "A list cannot nest under itself.",
        );
      }
      await this.nestList(sourcePath, target.parentPath, at, {
        beforePath: target.beforePath,
      });
      return;
    }
    const parents = await this.listParents(sourcePath);
    if (parents.length > 1) {
      throw new TaskListMutationError(
        "multiple-list-parents",
        "A list may have only one structural parent.",
      );
    }
    if (parents[0]) {
      await this.unnestList(sourcePath, target, at);
      return;
    }
    await this.movePinnedRoot(sourcePath, target, at);
  }

  private async replaceListItem(
    listPath: string,
    childPath: string,
    child: ParsedTaskFile | null,
    at: string,
    options?: { beforePath?: string | null },
  ): Promise<void> {
    const list = await this.loadDocument(listPath);
    const current = list.structuralLinks
      .filter((link) => link.kind === "list-item")
      .filter((link) => !this.linkTargetsPath(listPath, link.href, childPath))
      .map((link) => ({ title: link.title, href: link.href }));
    const nextLinks = [...current];
    if (child) {
      const entry = {
        title: child.title,
        href: navigationPinHref(listPath, childPath),
      };
      const beforeIndex = options?.beforePath
        ? nextLinks.findIndex((link) =>
            this.linkTargetsPath(listPath, link.href, options.beforePath!),
          )
        : -1;
      if (beforeIndex === -1) nextLinks.push(entry);
      else nextLinks.splice(beforeIndex, 0, entry);
    }
    const next = {
      ...setReservedLinks(list, "Items", nextLinks),
      updated: at,
    };
    await this.writeDocument(next);
  }

  private async rewriteNavigationPins(
    mutate: (pins: NavigationPin[], navigationPath: string) => NavigationPin[],
    at: string,
  ): Promise<void> {
    const navigation = await this.navigation();
    if (!navigation) {
      throw new TaskListMutationError(
        "missing-navigation",
        "The vault has no task-list-navigation document.",
      );
    }
    const document = await this.loadDocument(navigation.path);
    if (document.kind !== "task-list-navigation") {
      throw new TaskListMutationError(
        "missing-navigation",
        "The selected document is not a navigation file.",
      );
    }
    const pins = document.structuralLinks
      .filter((link) => link.kind === "navigation-item")
      .map((link) => ({
        title: link.title,
        href: link.href,
        section: link.heading ?? document.title,
      }));
    const nextPins = mutate(pins, navigation.path);
    const next = {
      ...document,
      updated: at,
      body: rewriteNavigationBody(document.title, nextPins),
    };
    await this.writeDocument(next);
  }

  private pinMatches(
    pin: NavigationPin,
    listPath: string,
    navigationPath = TASK_LIST_NAVIGATION_PATH,
  ): boolean {
    const resolved = resolveTaskHref(navigationPath, pin.href);
    return (
      resolved === listPath ||
      pin.href === listPath ||
      pin.href.endsWith(`/${listPath}`) ||
      listPath.endsWith(`/${pin.href.replace(/^\.\//, "")}`)
    );
  }

  private linkTargetsPath(
    sourcePath: string,
    href: string,
    targetPath: string,
  ): boolean {
    const resolved = resolveTaskHref(sourcePath, href);
    return (
      resolved === targetPath ||
      href === targetPath ||
      href.endsWith(`/${targetPath}`) ||
      targetPath.endsWith(`/${href.replace(/^\.\//, "")}`)
    );
  }

  async getByPath(path: string): Promise<TaskSummary | null> {
    const row = await this.database.getTaskRow({ path });
    return row ? taskRowToSummary(row) : null;
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
