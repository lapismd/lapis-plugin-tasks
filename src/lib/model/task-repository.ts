import type {
  AppDatabase,
  AppDatabaseTaskOccurrenceRecord,
  AppDatabaseTaskRecord,
} from "@lapis-notes/api/app-database";
import {
  and,
  eq,
  gte,
  lte,
  or,
  PUBLIC_TASK_OCCURRENCES_PROJECTION_ID,
  PUBLIC_TASKS_PROJECTION_ID,
  taskQueryToIndexQuery,
} from "@lapis-notes/api/app-database";
import {
  parseTaskDocument,
  serializeTaskDocument,
  type ParsedTaskFile,
  type TaskDocument,
  type TaskListDocument,
  type TaskPlan,
  type TaskComment,
  resetChecklistItems,
  type TaskStart,
} from "./task-document";
import {
  addStructuralEntryUnderHeading as addEntryUnderHeadingSource,
  createTaskHeading as createHeadingSource,
  insertStructuralTaskEntryEditorChange,
  moveStructuralTaskEntryEditorChanges,
  removeStructuralTaskEntryEditorChange,
  renameTaskHeading as renameHeadingSource,
  replaceStructuralTaskRun as replaceTaskRunSource,
  type StructuralTaskRun,
  type StructuralTaskRunEntryInput,
} from "./task-list-items";
import {
  resolveTaskDocumentStructure,
  scanTaskHeadings,
  validateTaskStructureGraph,
  type TaskStructureDiagnostic,
} from "./task-structure";
import {
  cancelTaskDocument,
  completeTaskDocument,
  planTaskDocument,
  reopenTaskDocument,
  setTaskDeadline,
  setTaskChecklistItemChecked,
  setTaskInbox,
  setTaskRepeat,
  setTaskTracking,
  setTaskStart,
  skipOccurrence,
} from "./task-mutations";
import {
  indexResolvedTaskDocument,
  indexTaskDocument,
  resolveTaskHref,
} from "./task-index";
import {
  moveNavigationPin,
  navigationPinHref,
  renameNavigationPins,
  rewriteNavigationBody,
  TASK_LIST_NAVIGATION_PATH,
  TaskListMutationError,
  type ListTreeDropTarget,
  type NavigationPin,
} from "./list-navigation";
import { projectTask } from "./task-projection";
import type { TaskSummary, TaskView } from "./task-queries";
import { todayDateOnly } from "./task-dates";
import { resolveEffectiveOccurrence } from "./effective-occurrence";
import { trackingCompletion } from "./task-occurrence";
import type { TaskOccurrenceRepository } from "./task-occurrence-repository";
import type { LocalDateString } from "./recurrence-engine";
import {
  buildTaskOccurrenceHistory,
  deriveTaskOccurrenceStatistics,
  filterTaskOccurrenceHistory,
  type TaskOccurrenceHistoryFilter,
  type TaskOccurrenceHistoryRow,
  type TaskOccurrenceStatistics,
} from "./task-history";

export type TaskFileStore = {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  remove?(path: string): Promise<void>;
  create?(path: string, content: string): Promise<void>;
  process?(path: string, mutate: (raw: string) => string): Promise<string>;
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
    async create(path, content) {
      if (store.has(path)) throw new Error("The destination already exists.");
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

function splitTaskNotes(body: string): { title: string; notes: string } {
  const heading = /^(?:[ \t]*\r?\n)*# [^\r\n]*(?:\r?\n|$)(?:[ \t]*\r?\n)*/.exec(
    body,
  );
  return {
    title: heading?.[0] ?? "",
    notes: body.slice(heading?.[0].length ?? 0),
  };
}

/** The compact row edits the body below its separately editable Task title. */
export function getTaskNotes(body: string): string {
  return splitTaskNotes(body).notes;
}

export function taskRowToSummary(row: AppDatabaseTaskRecord): TaskSummary {
  const repeatValue =
    row.repeat && typeof row.repeat === "object"
      ? (row.repeat as unknown as Record<string, unknown>)
      : null;
  const repeat =
    repeatValue &&
    typeof repeatValue.rrule === "string" &&
    (repeatValue.anchor === "schedule" ||
      repeatValue.anchor === "completion") &&
    (repeatValue.missed === "carry" || repeatValue.missed === "skip")
      ? (repeatValue as TaskSummary["repeat"])
      : undefined;
  return {
    id: row.documentId,
    path: row.documentPath,
    title: row.title,
    kind: row.kind as TaskSummary["kind"],
    status: row.status,
    priority: row.priority ?? undefined,
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
    repeat,
    unparsedRepeat: repeat ? undefined : (repeatValue ?? undefined),
    tracking:
      row.tracking && typeof row.tracking === "object"
        ? (row.tracking as TaskSummary["tracking"])
        : undefined,
    effectiveOccurrenceDate: row.effectiveOccurrenceDate ?? undefined,
    effectiveOccurrenceState: row.effectiveOccurrenceState ?? undefined,
    effectiveForDate: row.effectiveForDate ?? undefined,
  };
}

export class TaskRepository {
  private effectiveRefreshQueue: Promise<void> = Promise.resolve();
  private effectiveProjectionGeneration = 0;
  private verifiedEffectiveProjection: {
    date: string;
    generation: number;
  } | null = null;
  private effectiveVerificationResetTimer: ReturnType<
    typeof setTimeout
  > | null = null;
  private readonly effectiveRefreshListeners = new Set<
    (today: string) => void
  >();

  constructor(
    private readonly database: AppDatabase,
    private readonly files?: TaskFileStore,
    private readonly clock: () => Date = () => new Date(),
    private readonly occurrences?: TaskOccurrenceRepository,
  ) {}

  invalidateEffectiveOccurrences(): void {
    this.effectiveProjectionGeneration += 1;
    this.verifiedEffectiveProjection = null;
    if (this.effectiveVerificationResetTimer) {
      clearTimeout(this.effectiveVerificationResetTimer);
      this.effectiveVerificationResetTimer = null;
    }
  }

  subscribeEffectiveOccurrenceRefresh(
    listener: (today: string) => void,
  ): () => void {
    this.effectiveRefreshListeners.add(listener);
    return () => this.effectiveRefreshListeners.delete(listener);
  }

  async refreshEffectiveOccurrences(
    today = todayDateOnly(this.clock()),
  ): Promise<void> {
    const generation = this.effectiveProjectionGeneration;
    if (
      !this.files ||
      (this.verifiedEffectiveProjection?.date === today &&
        this.verifiedEffectiveProjection.generation === generation)
    ) {
      return;
    }
    const refresh = this.effectiveRefreshQueue
      .catch(() => undefined)
      .then(async () => {
        if (
          this.verifiedEffectiveProjection?.date === today &&
          this.verifiedEffectiveProjection.generation === generation
        ) {
          return;
        }
        const projected =
          await this.database.queryProjection<AppDatabaseTaskRecord>(
            PUBLIC_TASKS_PROJECTION_ID,
            taskQueryToIndexQuery({ kind: "task" }),
          );
        const staleRows = projected.rows.filter(
          (row) => row.repeat && row.effectiveForDate !== today,
        );
        for (const row of staleRows) {
          const raw = await this.files!.read(row.documentPath);
          const document = parseTaskDocument(raw, row.documentPath);
          if (!document || document.kind !== "task") continue;
          await indexTaskDocument(
            this.database,
            { ...document, raw },
            (sourcePath, href) => this.resolveStructureTarget(sourcePath, href),
            today,
          );
        }
        if (this.effectiveProjectionGeneration !== generation) return;
        const verification = { date: today, generation };
        this.verifiedEffectiveProjection = verification;
        if (this.effectiveVerificationResetTimer) {
          clearTimeout(this.effectiveVerificationResetTimer);
        }
        this.effectiveVerificationResetTimer = setTimeout(() => {
          if (this.verifiedEffectiveProjection === verification) {
            this.verifiedEffectiveProjection = null;
          }
          this.effectiveVerificationResetTimer = null;
        }, 0);
        if (staleRows.length) {
          for (const listener of this.effectiveRefreshListeners)
            listener(today);
        }
      });
    this.effectiveRefreshQueue = refresh;
    await refresh;
  }

  async get(id: string): Promise<TaskSummary | null> {
    const row =
      (await this.database.getProjectionRow<AppDatabaseTaskRecord>(
        PUBLIC_TASKS_PROJECTION_ID,
        id,
      )) ?? (await this.database.getTaskRow({ id }));
    return row ? taskRowToSummary(row) : null;
  }

  async getTaskDocument(idOrPath: string): Promise<TaskDocument> {
    const path = await this.resolvePath(idOrPath);
    if (!path) throw new Error(`Missing task document: ${idOrPath}`);
    const document = await this.loadDocument(path);
    if (document.kind !== "task") {
      throw new Error(`Not a task document: ${path}`);
    }
    return document;
  }

  async getDocument(idOrPath: string): Promise<ParsedTaskFile> {
    const path = await this.resolvePath(idOrPath);
    if (!path) throw new Error(`Missing task document: ${idOrPath}`);
    return this.loadDocument(path);
  }

  async getTaskListDocument(idOrPath: string): Promise<TaskListDocument> {
    const path = await this.resolvePath(idOrPath);
    if (!path) throw new Error(`Missing task-list document: ${idOrPath}`);
    const document = await this.loadDocument(path);
    if (document.kind !== "task-list") {
      throw new Error(`Not a task-list document: ${path}`);
    }
    return document;
  }

  async resolveTaskListItem(
    sourcePath: string,
    target: string,
  ): Promise<TaskSummary | null> {
    return this.getByPath(resolveTaskHref(sourcePath, target));
  }

  async replaceStructuralTaskRun(
    idOrPath: string,
    expected: StructuralTaskRun,
    entries: ReadonlyArray<StructuralTaskRunEntryInput>,
  ): Promise<TaskDocument | TaskListDocument> {
    if (!this.files) {
      throw new Error("TaskRepository mutations require a file store.");
    }
    const path = await this.resolvePath(idOrPath);
    if (!path) throw new Error(`Missing task document: ${idOrPath}`);
    const raw = await this.files.read(path);
    const nextRaw = replaceTaskRunSource(raw, expected, entries, path);
    const reparsed = parseTaskDocument(nextRaw, path);
    if (!reparsed || !["task", "task-list"].includes(reparsed.kind)) {
      throw new Error(
        `Task run mutation produced an invalid document: ${path}`,
      );
    }
    if (this.files.process)
      await this.files.process(path, (current) => {
        if (current !== raw)
          throw new Error("The structural source changed before saving.");
        return nextRaw;
      });
    else await this.files.write(path, nextRaw);
    const next = { ...reparsed, raw: nextRaw } as
      | TaskDocument
      | TaskListDocument;
    await indexTaskDocument(
      this.database,
      next,
      (sourcePath, href) => this.resolveStructureTarget(sourcePath, href),
      todayDateOnly(this.clock()),
    );
    return next;
  }

  async getStructuralTaskRuns(idOrPath: string): Promise<StructuralTaskRun[]> {
    const path = await this.resolvePath(idOrPath);
    if (!path) throw new Error(`Missing task document: ${idOrPath}`);
    const document = await this.loadDocument(path);
    if (document.kind === "task-list-navigation") return [];
    const structure = await resolveTaskDocumentStructure(
      document.raw,
      {
        documentId: document.id,
        documentPath: document.path,
        documentKind: document.kind,
      },
      (sourcePath, href) => this.resolveStructureTarget(sourcePath, href),
    );
    const headings = scanTaskHeadings(document.raw);
    return structure.runs.map((run, ordinal) => ({
      id: run.id,
      ordinal,
      documentId: run.documentId,
      documentPath: run.documentPath,
      headingPath: run.headingPath,
      headingLevel: run.headingLevel,
      headingText: run.headingText,
      headingFrom:
        headings.find(
          (heading) =>
            heading.level === run.headingLevel &&
            heading.path.join("\u0000") === run.headingPath.join("\u0000"),
        )?.sourceStart ?? null,
      headingTo:
        headings.find(
          (heading) =>
            heading.level === run.headingLevel &&
            heading.path.join("\u0000") === run.headingPath.join("\u0000"),
        )?.sourceEnd ?? null,
      listDepth: run.listDepth,
      from: run.startOffset,
      to: run.endOffset,
      source: run.source,
      entries: run.entries.map((entry) => ({
        label: entry.authoredLabel,
        target: entry.authoredHref,
        kind: entry.kind,
        targetId: entry.targetDocumentId,
        targetPath: entry.targetDocumentPath,
        from: entry.sourceStart,
        to: entry.sourceEnd,
        source: document.raw.slice(entry.sourceStart, entry.sourceEnd),
      })),
    }));
  }

  async renameHeading(
    idOrPath: string,
    headingPath: readonly string[],
    nextText: string,
  ): Promise<void> {
    const path = await this.resolvePath(idOrPath);
    if (!path) throw new Error(`Missing task document: ${idOrPath}`);
    const raw = await this.files!.read(path);
    await this.writeRawDocument(
      path,
      renameHeadingSource(raw, headingPath, nextText),
      raw,
    );
  }

  async createHeading(
    idOrPath: string,
    text: string,
    level = 2,
  ): Promise<void> {
    const path = await this.resolvePath(idOrPath);
    if (!path) throw new Error(`Missing task document: ${idOrPath}`);
    const raw = await this.files!.read(path);
    await this.writeRawDocument(
      path,
      createHeadingSource(raw, text, level),
      raw,
    );
  }

  async addStructuralEntryUnderHeading(
    idOrPath: string,
    headingPath: readonly string[],
    entry: StructuralTaskRunEntryInput,
  ): Promise<void> {
    const path = await this.resolvePath(idOrPath);
    if (!path) throw new Error(`Missing task document: ${idOrPath}`);
    const raw = await this.files!.read(path);
    await this.writeRawDocument(
      path,
      addEntryUnderHeadingSource(raw, headingPath, entry),
      raw,
    );
  }

  async moveStructuralEntry(
    sourcePath: string,
    sourceRun: StructuralTaskRun,
    sourceIndex: number,
    targetPath: string,
    targetRun: StructuralTaskRun,
    targetIndex: number,
  ): Promise<void> {
    const source = await this.files!.read(sourcePath);
    if (sourcePath === targetPath) {
      const changes = moveStructuralTaskEntryEditorChanges(
        source,
        sourceRun,
        sourceIndex,
        targetRun,
        targetIndex,
      );
      const next = [...changes]
        .sort((left, right) => right.from - left.from)
        .reduce(
          (value, change) =>
            `${value.slice(0, change.from)}${change.insert}${value.slice(change.to)}`,
          source,
        );
      await this.writeRawDocument(sourcePath, next, source);
      return;
    }

    const moving = sourceRun.entries[sourceIndex];
    if (!moving) throw new Error("The structural entry no longer exists.");
    const target = await this.files!.read(targetPath);
    const remove = removeStructuralTaskEntryEditorChange(
      source,
      sourceRun,
      sourceIndex,
    );
    const insert = insertStructuralTaskEntryEditorChange(
      target,
      targetRun,
      targetIndex,
      {
        ...moving,
        target: navigationPinHref(targetPath, moving.targetPath),
        source: undefined,
      },
    );
    const nextSource = `${source.slice(0, remove.from)}${remove.insert}${source.slice(remove.to)}`;
    const nextTarget = `${target.slice(0, insert.from)}${insert.insert}${target.slice(insert.to)}`;
    if (!parseTaskDocument(nextSource, sourcePath)) {
      throw new Error("Structural move produced an invalid source document.");
    }
    if (!parseTaskDocument(nextTarget, targetPath)) {
      throw new Error("Structural move produced an invalid target document.");
    }
    await this.writeRawDocument(sourcePath, nextSource, source);
    await this.writeRawDocument(targetPath, nextTarget, target);
  }

  async setChecklistItemChecked(
    idOrPath: string,
    position: number,
    expectedText: string,
    checked: boolean,
  ): Promise<TaskDocument> {
    if (!this.files) {
      throw new Error("TaskRepository mutations require a file store.");
    }
    const path = await this.resolvePath(idOrPath);
    if (!path) throw new Error(`Missing task document: ${idOrPath}`);
    const raw = await this.files.read(path);
    const current = parseTaskDocument(raw, path);
    if (!current || current.kind !== "task") {
      throw new Error(`Not a task document: ${path}`);
    }
    const next = setTaskChecklistItemChecked(
      current,
      position,
      expectedText,
      checked,
    );
    const prefix = raw.slice(0, raw.length - current.body.length);
    const nextRaw = `${prefix}${next.body}`;
    const reparsed = parseTaskDocument(nextRaw, path);
    if (!reparsed || reparsed.kind !== "task") {
      throw new Error(`Checklist mutation produced an invalid task: ${path}`);
    }
    if (this.files.process)
      await this.files.process(path, (current) => {
        if (current !== raw)
          throw new Error("The structural source changed before saving.");
        return nextRaw;
      });
    else await this.files.write(path, nextRaw);
    await indexTaskDocument(
      this.database,
      { ...reparsed, raw: nextRaw },
      (sourcePath, href) => this.resolveStructureTarget(sourcePath, href),
      todayDateOnly(this.clock()),
    );
    return { ...reparsed, raw: nextRaw };
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

  async logbook(): Promise<TaskSummary[]> {
    const result = await this.database.queryProjection<AppDatabaseTaskRecord>(
      PUBLIC_TASKS_PROJECTION_ID,
      {
        where: and(
          eq("kind", "task"),
          or(eq("status", "completed"), eq("status", "canceled")),
        ),
      },
    );
    return result.rows.map(taskRowToSummary);
  }

  async occurrenceHistory(
    start: LocalDateString,
    end: LocalDateString,
    today: LocalDateString,
    filter: TaskOccurrenceHistoryFilter = "all",
  ): Promise<TaskOccurrenceHistoryRow[]> {
    await this.refreshEffectiveOccurrences(today);
    const [taskResult, occurrenceResult] = await Promise.all([
      this.database.queryProjection<AppDatabaseTaskRecord>(
        PUBLIC_TASKS_PROJECTION_ID,
        taskQueryToIndexQuery({ kind: "task" }),
      ),
      this.database.queryProjection<AppDatabaseTaskOccurrenceRecord>(
        PUBLIC_TASK_OCCURRENCES_PROJECTION_ID,
        {
          where: and(gte("occurrenceDate", start), lte("occurrenceDate", end)),
          orderBy: [{ field: "occurrenceDate", direction: "asc" }],
        },
      ),
    ]);
    return filterTaskOccurrenceHistory(
      buildTaskOccurrenceHistory(
        taskResult.rows.map(taskRowToSummary),
        occurrenceResult.rows,
        start,
        end,
        today,
      ),
      filter,
    );
  }

  async occurrenceStatistics(
    taskId: string,
    start: LocalDateString,
    end: LocalDateString,
    today: LocalDateString,
  ): Promise<TaskOccurrenceStatistics> {
    const rows = (await this.occurrenceHistory(start, end, today)).filter(
      (row) => row.taskId === taskId,
    );
    return deriveTaskOccurrenceStatistics(rows, today);
  }

  async lists(): Promise<TaskSummary[]> {
    const result = await this.database.queryProjection<AppDatabaseTaskRecord>(
      PUBLIC_TASKS_PROJECTION_ID,
      taskQueryToIndexQuery({ kind: "task-list" }),
    );
    return result.rows.map(taskRowToSummary);
  }

  async validateStructuralGraph(): Promise<TaskStructureDiagnostic[]> {
    if (!this.files) return [];
    const projected =
      await this.database.queryProjection<AppDatabaseTaskRecord>(
        PUBLIC_TASKS_PROJECTION_ID,
        {},
      );
    const loaded = await Promise.all(
      projected.rows.map(async (row) => {
        try {
          return await this.loadDocument(row.documentPath);
        } catch {
          return null;
        }
      }),
    );
    const documents = loaded.filter(
      (document): document is TaskDocument | TaskListDocument =>
        Boolean(document && document.kind !== "task-list-navigation"),
    );
    const structures = await Promise.all(
      documents.map((document) =>
        resolveTaskDocumentStructure(
          document.raw,
          {
            documentId: document.id,
            documentPath: document.path,
            documentKind: document.kind,
          },
          (sourcePath, href) => this.resolveStructureTarget(sourcePath, href),
        ),
      ),
    );
    const validated = validateTaskStructureGraph(structures);
    for (const document of documents) {
      await indexResolvedTaskDocument(
        this.database,
        document,
        validated.get(document.path) ?? null,
        todayDateOnly(this.clock()),
      );
    }
    return [...validated.values()].flatMap(
      (structure) => structure.diagnostics,
    );
  }

  async children(idOrPath: string): Promise<TaskSummary[]> {
    return (
      (await this.structuralItems(idOrPath, ["task-entry"])) ??
      this.related(idOrPath, "task-entry")
    );
  }

  async items(idOrPath: string): Promise<TaskSummary[]> {
    const indexed = await this.structuralItems(idOrPath, [
      "task-entry",
      "list-entry",
    ]);
    if (indexed) return indexed;
    const [tasks, lists] = await Promise.all([
      this.related(idOrPath, "task-entry"),
      this.related(idOrPath, "list-entry"),
    ]);
    return [...tasks, ...lists];
  }

  async parent(idOrPath: string): Promise<TaskSummary | null> {
    const rowId = await this.resolveRowId(idOrPath);
    if (!rowId) return null;
    for (const relation of ["task-entry", "list-entry"] as const) {
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
      rows
        .slice()
        .sort((left, right) => left.path.localeCompare(right.path))[0] ??
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
      relation: "list-entry",
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
      relation: "list-entry",
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
    const lists = (await this.lists()).filter(
      (list) => list.status === "active",
    );
    const pinned = new Set(
      (await this.pinnedRoots()).map((pin) => pin.list.id),
    );
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

  async complete(
    path: string,
    at: string,
    trackedValue?: number,
  ): Promise<TaskSummary> {
    const localDate = todayDateOnly(this.clock()) as LocalDateString;
    const current = await this.loadDocument(path);
    const next = completeTaskDocument(current, at, localDate);
    if (
      this.occurrences &&
      current.kind === "task" &&
      current.task.repeat &&
      current.task.tracking
    ) {
      const establishedRepeat =
        current.task.repeat.anchor === "completion" &&
        !current.task.repeat.start
          ? {
              ...current.task.repeat,
              start: localDate,
              missed: "carry" as const,
            }
          : current.task.repeat;
      const occurrence = resolveEffectiveOccurrence(
        establishedRepeat,
        current.task.plan?.date as LocalDateString | undefined,
        localDate,
      );
      if (!occurrence.date) {
        throw new Error(
          "Recurring completion has no effective occurrence date.",
        );
      }
      await this.occurrences.complete(
        current,
        occurrence.date,
        trackingCompletion(current.task.tracking, trackedValue),
      );
    }
    await this.writeDocument(next);
    return taskRowToSummary(projectTask(next, localDate));
  }

  async cancel(path: string, at: string): Promise<TaskSummary> {
    return this.mutate(path, (document) => cancelTaskDocument(document, at));
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
      ...(document.kind === "task-list" && document.frontMatterTitle
        ? { frontMatterTitle: title }
        : {}),
      updated: at,
      body: replaceTitleHeading(document.body, title),
    }));
  }

  async setNotes(
    path: string,
    notes: string,
    expectedNotes: string,
    at: string,
  ): Promise<TaskSummary> {
    return this.mutate(path, (document) => {
      if (document.kind !== "task")
        throw new Error(`Not a task document: ${path}`);
      const current = splitTaskNotes(document.body);
      if (current.notes !== expectedNotes && current.notes !== notes)
        throw new Error(
          "The Task notes changed before saving. Your edits have been retained.",
        );
      return { ...document, updated: at, body: current.title + notes };
    });
  }

  async renameList(
    path: string,
    title: string,
    at: string,
  ): Promise<TaskSummary> {
    const next = title.trim();
    if (!next) {
      throw new TaskListMutationError("invalid-title", "A list needs a title.");
    }
    const renamed = await this.setTitle(path, next, at);
    const parents = await this.listParents(path);
    for (const parent of parents) {
      const runs = (await this.getStructuralTaskRuns(parent.path))
        .filter((run) =>
          run.entries.some((entry) =>
            this.linkTargetsPath(parent.path, entry.target, path),
          ),
        )
        .sort((left, right) => right.from - left.from);
      for (const run of runs) {
        await this.replaceStructuralTaskRun(
          parent.path,
          run,
          run.entries.map((entry) => ({
            ...entry,
            label: this.linkTargetsPath(parent.path, entry.target, path)
              ? next
              : entry.label,
            source: undefined,
          })),
        );
      }
    }
    if (await this.navigation()) {
      await this.rewriteNavigationPins(
        (pins, navigationPath) =>
          pins.map((pin) =>
            this.pinMatches(pin, path, navigationPath)
              ? { ...pin, title: next }
              : pin,
          ),
        at,
      );
    }
    return renamed;
  }

  async archiveList(path: string, at: string): Promise<TaskSummary> {
    const archived = await this.mutate(path, (current) => {
      if (current.kind !== "task-list") {
        throw new TaskListMutationError(
          "not-a-list",
          "Only task-lists can be archived.",
        );
      }
      return {
        ...current,
        list: { ...current.list, status: "archived" },
        updated: at,
      };
    });
    await this.unpinList(path, at);
    return archived;
  }

  async deleteList(
    path: string,
    at: string,
    options: { skipParentPaths?: readonly string[] } = {},
  ): Promise<void> {
    const document = await this.loadDocument(path);
    if (document.kind !== "task-list") {
      throw new TaskListMutationError(
        "not-a-list",
        "Only task-lists can be deleted.",
      );
    }
    const parents = await this.listParents(path);
    const skippedParents = new Set(options.skipParentPaths ?? []);
    for (const parent of parents) {
      if (skippedParents.has(parent.path)) continue;
      await this.replaceListItem(parent.path, path, null, at);
    }
    await this.unpinList(path, at);
    await this.remove(path, options);
  }

  async renameNavigationSection(
    from: string,
    to: string,
    at: string,
  ): Promise<void> {
    const next = to.trim();
    if (!next) {
      throw new TaskListMutationError(
        "invalid-title",
        "A navigation section needs a title.",
      );
    }
    if (next === from) return;
    await this.rewriteNavigationPins(
      (pins) => renameNavigationPins(pins, from, next),
      at,
    );
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
      `task-${
        input.title
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "untitled"
      }-${input.at.slice(0, 10)}`;
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
    return taskRowToSummary(projectTask(document, todayDateOnly(this.clock())));
  }

  async createList(input: {
    path: string;
    title: string;
    at: string;
    id?: string;
    pin?: { section: string };
  }): Promise<TaskSummary> {
    const slug =
      input.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .replace(/^list-/, "") || "untitled";
    const id = input.id ?? `list-${slug}`;
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
      body: `# ${input.title}\n`,
      structuralLinks: [],
      diagnostics: [],
    };
    await this.writeDocument(document);
    if (input.pin) {
      await this.pinList(input.path, input.pin.section, input.at);
    }
    return taskRowToSummary(projectTask(document, todayDateOnly(this.clock())));
  }

  /** The repository owns timestamps for every presentation surface. */
  now(): Date {
    return this.clock();
  }

  async setPriority(
    path: string,
    priority: TaskDocument["task"]["priority"],
    at: string,
  ): Promise<TaskSummary> {
    return this.mutate(path, (document) => {
      if (document.kind !== "task")
        throw new Error("Priority requires a Task.");
      return {
        ...document,
        updated: at,
        task: { ...document.task, priority, unparsedPriority: undefined },
      };
    });
  }

  async addComment(
    path: string,
    text: string,
    at = this.clock().toISOString(),
  ): Promise<TaskComment> {
    const value = text.trim();
    if (!value) throw new Error("A comment needs text.");
    const comment: TaskComment = { id: crypto.randomUUID(), at, text: value };
    await this.mutate(path, (document) => {
      if (document.kind !== "task") throw new Error("Comments require a Task.");
      return {
        ...document,
        updated: at,
        task: {
          ...document.task,
          comments: [...document.task.comments, comment],
        },
      };
    });
    return comment;
  }

  async updateComment(
    path: string,
    id: string,
    patch: { text?: string; resolved?: boolean },
    expected: TaskComment,
  ): Promise<void> {
    await this.mutate(path, (document) => {
      if (document.kind !== "task") throw new Error("Comments require a Task.");
      const current = document.task.comments.find(
        (comment) => comment.id === id,
      );
      if (!current || JSON.stringify(current) !== JSON.stringify(expected))
        throw new Error("This comment changed. Reload before saving.");
      if (patch.text !== undefined && !patch.text.trim())
        throw new Error("A comment needs text.");
      const at = this.clock().toISOString();
      return {
        ...document,
        updated: at,
        task: {
          ...document.task,
          comments: document.task.comments.map((comment) =>
            comment.id === id
              ? {
                  ...comment,
                  ...patch,
                  ...(patch.text !== undefined
                    ? { text: patch.text.trim(), editedAt: at }
                    : {}),
                }
              : comment,
          ),
        },
      };
    });
  }

  async removeComment(path: string, expected: TaskComment): Promise<void> {
    await this.mutate(path, (document) => {
      if (document.kind !== "task") throw new Error("Comments require a Task.");
      const current = document.task.comments.find(
        (comment) => comment.id === expected.id,
      );
      if (!current || JSON.stringify(current) !== JSON.stringify(expected))
        throw new Error("This comment changed. Reload before deleting.");
      return {
        ...document,
        updated: this.clock().toISOString(),
        task: {
          ...document.task,
          comments: document.task.comments.filter(
            (comment) => comment.id !== expected.id,
          ),
        },
      };
    });
  }

  async markDocumentIncomplete(path: string): Promise<void> {
    const children = await this.children(path);
    await this.mutate(path, (document) => {
      if (document.kind !== "task")
        throw new Error("Checklist reset requires a Task.");
      return {
        ...document,
        updated: this.clock().toISOString(),
        body: resetChecklistItems(document.body, true),
      };
    });
    for (const child of children) {
      if (child.status === "completed")
        await this.reopen(child.path, this.clock().toISOString());
    }
  }

  async duplicate(path: string, targetPath: string): Promise<TaskSummary> {
    if (await this.getByPath(targetPath))
      throw new Error("The duplicate destination already exists.");
    const original = await this.getTaskDocument(path);
    const parents = await this.taskParents(path);
    if (parents.length > 1)
      throw new Error(
        "A Task with multiple parents cannot be duplicated safely.",
      );
    const title = `${original.title} (copy)`;
    let body = resetChecklistItems(original.body, true);
    const bodyStructure = await resolveTaskDocumentStructure(
      body,
      {
        documentId: original.id,
        documentPath: original.path,
        documentKind: "task",
      },
      (sourcePath, href) => this.resolveStructureTarget(sourcePath, href),
    );
    for (const entry of [...bodyStructure.entries].sort(
      (a, b) => b.sourceStart - a.sourceStart,
    )) {
      const source = body.slice(entry.sourceStart, entry.sourceEnd);
      body =
        body.slice(0, entry.sourceStart) +
        source.replace(/^(\s*[-*+]\s+)/, "$1Reference: ") +
        body.slice(entry.sourceEnd);
    }
    // Rewrite all local links when the duplicate lives in another folder.
    body = body.replace(
      /(\]\()([^\s)]+)(\))/g,
      (match, before: string, href: string, after: string) =>
        /^(?:[a-z]+:|#)/i.test(href)
          ? match
          : `${before}${navigationPinHref(targetPath, resolveTaskHref(path, href))}${after}`,
    );
    body = replaceTitleHeading(body, title);
    const at = this.clock().toISOString();
    const repeat = original.task.repeat
      ? {
          ...original.task.repeat,
          lastCompletedAt: undefined,
          completionCount: undefined,
        }
      : undefined;
    const next: TaskDocument = {
      ...original,
      path: targetPath,
      id: crypto.randomUUID(),
      title,
      created: at,
      updated: at,
      raw: "",
      body,
      task: {
        ...original.task,
        status: "open",
        completedAt: undefined,
        inbox: true,
        comments: [],
        repeat,
      },
    };
    const raw = serializeTaskDocument({ ...next, raw: original.raw });
    if (!this.files?.create)
      throw new Error("Task duplication requires a create-capable file store.");
    await this.files.create(targetPath, raw);
    await indexTaskDocument(
      this.database,
      parseTaskDocument(raw, targetPath)!,
      (sourcePath, href) => this.resolveStructureTarget(sourcePath, href),
      todayDateOnly(this.clock()),
    );
    if (parents[0]) {
      const parent = parents[0];
      const run = (await this.getStructuralTaskRuns(parent.path)).find(
        (candidate) =>
          candidate.entries.some((entry) => entry.targetPath === path),
      );
      if (!run)
        throw new Error(
          "The original parent entry changed before duplication.",
        );
      const entries: StructuralTaskRunEntryInput[] = [...run.entries];
      const index = entries.findIndex(
        (entry) => "targetPath" in entry && entry.targetPath === path,
      );
      entries.splice(index + 1, 0, {
        label: title,
        target: navigationPinHref(parent.path, targetPath),
      });
      await this.replaceStructuralTaskRun(parent.path, run, entries);
      await this.setInbox(targetPath, false, at);
    }
    return (await this.getByPath(targetPath))!;
  }

  async taskParents(idOrPath: string): Promise<TaskSummary[]> {
    const path = await this.resolvePath(idOrPath);
    if (!path) return [];
    const projected =
      await this.database.queryProjection<AppDatabaseTaskRecord>(
        PUBLIC_TASKS_PROJECTION_ID,
        {},
      );
    const parents: TaskSummary[] = [];
    for (const row of projected.rows) {
      if (
        row.documentPath === path ||
        row.kind === ("task-list-navigation" as AppDatabaseTaskRecord["kind"])
      )
        continue;
      const runs = await this.getStructuralTaskRuns(row.documentPath);
      if (
        runs.some((run) =>
          run.entries.some((entry) => entry.targetPath === path),
        )
      )
        parents.push(taskRowToSummary(row));
    }
    return parents;
  }

  async remove(
    path: string,
    options: { skipParentPaths?: readonly string[] } = {},
  ): Promise<void> {
    if (!this.files?.remove) {
      throw new Error("TaskRepository deletions require a file store remove.");
    }
    for (const parent of await this.taskParents(path)) {
      if (options.skipParentPaths?.includes(parent.path)) continue;
      await this.replaceListItem(
        parent.path,
        path,
        null,
        this.clock().toISOString(),
      );
    }
    await this.files.remove(path);
    await this.database.deleteProjectionSource(
      PUBLIC_TASKS_PROJECTION_ID,
      path,
      "tasks",
    );
  }

  async skip(path: string, at: string): Promise<TaskSummary> {
    const localDate = todayDateOnly(this.clock()) as LocalDateString;
    const current = await this.loadDocument(path);
    const next = skipOccurrence(current, at, localDate);
    if (this.occurrences && current.kind === "task" && current.task.repeat) {
      const occurrence = resolveEffectiveOccurrence(
        current.task.repeat,
        current.task.plan?.date as LocalDateString | undefined,
        localDate,
      );
      if (occurrence.date)
        await this.occurrences.ensure(current, occurrence.date);
    }
    await this.writeDocument(next);
    return taskRowToSummary(projectTask(next, localDate));
  }

  async planFor(
    path: string,
    plan: TaskPlan | undefined,
    at: string,
  ): Promise<TaskSummary> {
    return this.mutate(path, (document) =>
      planTaskDocument(document, plan, at),
    );
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

  async setRepeat(
    path: string,
    repeat: TaskDocument["task"]["repeat"],
    at: string,
  ): Promise<TaskSummary> {
    return this.mutate(path, (document) => setTaskRepeat(document, repeat, at));
  }

  async setTracking(
    path: string,
    tracking: TaskDocument["task"]["tracking"],
    at: string,
  ): Promise<TaskSummary> {
    return this.mutate(path, (document) =>
      setTaskTracking(document, tracking, at),
    );
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
    return taskRowToSummary(projectTask(child, todayDateOnly(this.clock())));
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
    const runs = await this.getStructuralTaskRuns(listPath);
    const matchingRuns = runs.filter((run) =>
      orderedChildPaths.some((path) =>
        run.entries.some((entry) =>
          this.linkTargetsPath(listPath, entry.target, path),
        ),
      ),
    );
    if (matchingRuns.length !== 1) {
      throw new TaskListMutationError(
        "cross-run-sort",
        "A sort can only reorder entries inside one contiguous task run.",
      );
    }
    const run = matchingRuns[0]!;
    const ordered = orderedChildPaths.flatMap((childPath) => {
      const entry = run.entries.find((candidate) =>
        this.linkTargetsPath(listPath, candidate.target, childPath),
      );
      return entry ? [entry] : [];
    });
    for (const entry of run.entries) {
      if (!ordered.includes(entry)) ordered.push(entry);
    }
    await this.replaceStructuralTaskRun(listPath, run, ordered);
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
    const matching = (await this.getStructuralTaskRuns(listPath))
      .filter((run) =>
        run.entries.some((entry) =>
          this.linkTargetsPath(listPath, entry.target, childPath),
        ),
      )
      .sort((left, right) => right.from - left.from);
    for (const run of matching) {
      await this.replaceStructuralTaskRun(
        listPath,
        run,
        run.entries.filter(
          (entry) => !this.linkTargetsPath(listPath, entry.target, childPath),
        ),
      );
    }
    if (!child) return;

    const runs = await this.getStructuralTaskRuns(listPath);
    const beforeRun = options?.beforePath
      ? runs.find((run) =>
          run.entries.some((entry) =>
            this.linkTargetsPath(listPath, entry.target, options.beforePath!),
          ),
        )
      : null;
    const targetRun = beforeRun ?? runs.find((run) => run.listDepth === 0);
    const entry = {
      label: child.title,
      target: navigationPinHref(listPath, childPath),
    };
    if (targetRun) {
      const entries = [...targetRun.entries];
      const beforeIndex = options?.beforePath
        ? entries.findIndex((candidate) =>
            this.linkTargetsPath(
              listPath,
              candidate.target,
              options.beforePath!,
            ),
          )
        : -1;
      if (beforeIndex < 0) entries.push(entry as (typeof entries)[number]);
      else entries.splice(beforeIndex, 0, entry as (typeof entries)[number]);
      await this.replaceStructuralTaskRun(listPath, targetRun, entries);
      return;
    }

    const document = await this.loadDocument(listPath);
    const newline = document.raw.includes("\r\n") ? "\r\n" : "\n";
    const suffix = document.raw.endsWith(newline) ? "" : newline;
    const nextRaw = `${document.raw}${suffix}${newline}- [${entry.label}](${entry.target})${newline}`;
    const next = parseTaskDocument(nextRaw, listPath);
    if (!next || next.kind === "task-list-navigation") {
      throw new TaskListMutationError(
        "invalid-structural-move",
        "Adding the structural entry produced an invalid task document.",
      );
    }
    await this.files!.write(listPath, nextRaw);
    await indexTaskDocument(
      this.database,
      { ...next, raw: nextRaw },
      (sourcePath, href) => this.resolveStructureTarget(sourcePath, href),
      todayDateOnly(this.clock()),
    );
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
    let next: ParsedTaskFile;
    if (this.files?.process) {
      const raw = await this.files.process(path, (current) => {
        const parsed = parseTaskDocument(current, path);
        if (!parsed) throw new Error(`Not a task document: ${path}`);
        return serializeTaskDocument(mutate(parsed));
      });
      next = parseTaskDocument(raw, path)!;
      this.invalidateEffectiveOccurrences();
      await indexTaskDocument(
        this.database,
        next,
        (sourcePath, href) => this.resolveStructureTarget(sourcePath, href),
        todayDateOnly(this.clock()),
      );
    } else {
      next = mutate(await this.loadDocument(path));
      await this.writeDocument(next);
    }
    return taskRowToSummary(projectTask(next, todayDateOnly(this.clock())));
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
    if (this.files.process && document.raw) {
      await this.files.process(document.path, (raw) => {
        if (raw !== document.raw)
          throw new Error(
            "The Task document changed before saving. Your edits have been retained.",
          );
        return serialized;
      });
    } else if (!document.raw && this.files.create)
      await this.files.create(document.path, serialized);
    else await this.files.write(document.path, serialized);
    this.invalidateEffectiveOccurrences();
    await indexTaskDocument(
      this.database,
      { ...next, raw: serialized },
      (sourcePath, href) => this.resolveStructureTarget(sourcePath, href),
      todayDateOnly(this.clock()),
    );
  }

  private async writeRawDocument(
    path: string,
    raw: string,
    expected: string,
  ): Promise<void> {
    if (!this.files) {
      throw new Error("TaskRepository mutations require a file store.");
    }
    const parsed = parseTaskDocument(raw, path);
    if (!parsed || parsed.kind === "task-list-navigation") {
      throw new Error(
        `Structural mutation produced an invalid task document: ${path}`,
      );
    }
    if (this.files.process)
      await this.files.process(path, (current) => {
        if (current !== expected)
          throw new Error(
            "The Task document changed before saving. Your edits have been retained.",
          );
        return raw;
      });
    else {
      if ((await this.files.read(path)) !== expected)
        throw new Error(
          "The Task document changed before saving. Your edits have been retained.",
        );
      await this.files.write(path, raw);
    }
    this.invalidateEffectiveOccurrences();
    await indexTaskDocument(
      this.database,
      { ...parsed, raw },
      (sourcePath, href) => this.resolveStructureTarget(sourcePath, href),
      todayDateOnly(this.clock()),
    );
  }

  private async resolveStructureTarget(sourcePath: string, href: string) {
    if (!this.files) return null;
    const targetPath = resolveTaskHref(sourcePath, href);
    if (!targetPath) return null;
    try {
      const raw = await this.files.read(targetPath);
      const target = parseTaskDocument(raw, targetPath);
      if (!target || target.kind === "task-list-navigation") {
        return {
          id: targetPath,
          path: targetPath,
          kind: "unsupported" as const,
          title:
            targetPath.split("/").pop()?.replace(/\.md$/i, "") ?? targetPath,
        };
      }
      return {
        id: target.id,
        path: target.path,
        kind: target.kind,
        title: target.title,
      } as const;
    } catch {
      return null;
    }
  }

  private async resolvePath(idOrPath: string): Promise<string | null> {
    const byPath = await this.database.getTaskRow({ path: idOrPath });
    if (byPath) return byPath.documentPath;
    const byId = await this.database.getTaskRow({ id: idOrPath });
    return byId?.documentPath ?? null;
  }

  private async related(
    idOrPath: string,
    relation: "task-entry" | "list-entry",
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

  private async structuralItems(
    idOrPath: string,
    kinds: Array<"task-entry" | "list-entry">,
  ): Promise<TaskSummary[] | null> {
    const rowId = await this.resolveRowId(idOrPath);
    if (!rowId) return [];
    const source = await this.database.getProjectionRow<AppDatabaseTaskRecord>(
      PUBLIC_TASKS_PROJECTION_ID,
      rowId,
    );
    if (!source?.structure) return null;
    const allowed = new Set(kinds);
    const rows = await Promise.all(
      source.structure.entries
        .filter((entry) => allowed.has(entry.kind))
        .map((entry) =>
          this.database.getProjectionRow<AppDatabaseTaskRecord>(
            PUBLIC_TASKS_PROJECTION_ID,
            entry.targetDocumentId,
          ),
        ),
    );
    return rows
      .filter((row): row is AppDatabaseTaskRecord => Boolean(row))
      .map(taskRowToSummary);
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

  private async query(
    view: Exclude<TaskView, "logbook">,
    today?: string,
  ): Promise<TaskSummary[]> {
    if (today) await this.refreshEffectiveOccurrences(today);
    const result = await this.database.queryProjection<AppDatabaseTaskRecord>(
      PUBLIC_TASKS_PROJECTION_ID,
      taskQueryToIndexQuery({ view, today }),
    );
    return result.rows.map(taskRowToSummary);
  }
}
