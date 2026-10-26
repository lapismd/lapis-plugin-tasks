import type { NativeTaskAdapter } from "./native-task-adapter";
import type { App } from "@lapis-notes/api";
import type {
  AppDatabase,
  AppDatabaseTaskOccurrenceRecord,
} from "@lapis-notes/api/app-database";
import {
  PUBLIC_TASK_OCCURRENCES_PROJECTION_ID,
  and,
  eq,
  gte,
  lte,
} from "@lapis-notes/api/app-database";
import type { TasksDayPartSettings } from "../tasks-settings";
import type { TaskDocument, TaskPlan, TaskTracking } from "./task-document";
import {
  completeTaskOccurrence,
  materializeTaskOccurrence,
  scanTaskOccurrenceObservations,
  type TaskOccurrenceCompletion,
  type TaskOccurrenceDayPart,
  type TaskOccurrenceObservation,
} from "./task-occurrence";
import type { LocalDateString } from "./recurrence-engine";

export type DailyDocumentMutationStore = {
  ensure(date: LocalDateString): Promise<{ path: string }>;
  process(path: string, mutate: (raw: string) => string): Promise<string>;
};

export function createAppDailyDocumentMutationStore(
  app: App,
): DailyDocumentMutationStore {
  return {
    async ensure(date) {
      return app.dailyDocumentProviders.resolve().ensure(date);
    },
    async process(path, mutate) {
      const file = app.vault.getFileByPath(path);
      if (!file) throw new Error(`Daily note disappeared before update: ${path}`);
      return app.vault.process(file, mutate);
    },
  };
}

export function taskOccurrenceDayPart(
  plan: TaskPlan | undefined,
  settings: TasksDayPartSettings,
): TaskOccurrenceDayPart {
  if (!plan) return "anytime";
  if (plan.at === "morning" || plan.at === "afternoon" || plan.at === "evening") {
    return plan.at;
  }
  if (plan.at !== "time" || !plan.time) return "anytime";
  if (plan.time < settings.afternoonStartsAt) return "morning";
  if (plan.time < settings.eveningStartsAt) return "afternoon";
  return "evening";
}

export type TaskOccurrenceSource = Pick<TaskDocument, "id" | "path" | "title"> & {
  task: Pick<TaskDocument["task"], "plan" | "tracking">;
};

export class TaskOccurrenceRepository {
  constructor(
    private readonly database: AppDatabase,
    private readonly documents: DailyDocumentMutationStore,
    private readonly dayParts: () => TasksDayPartSettings,
    private readonly native?: NativeTaskAdapter,
  ) {}

  async ensure(
    task: TaskOccurrenceSource,
    occurrenceDate: LocalDateString,
  ): Promise<TaskOccurrenceObservation> {
    return this.write(task, occurrenceDate);
  }

  async complete(
    task: TaskOccurrenceSource,
    occurrenceDate: LocalDateString,
    completion: TaskOccurrenceCompletion,
  ): Promise<TaskOccurrenceObservation> {
    return this.write(task, occurrenceDate, completion);
  }

  async between(
    start: LocalDateString,
    end: LocalDateString,
    taskId?: string,
  ): Promise<AppDatabaseTaskOccurrenceRecord[]> {
    const result = await this.database.queryProjection<AppDatabaseTaskOccurrenceRecord>(
      PUBLIC_TASK_OCCURRENCES_PROJECTION_ID,
      {
        where: and(
          gte("occurrenceDate", start),
          lte("occurrenceDate", end),
          ...(taskId ? [eq("taskId", taskId)] : []),
        ),
        orderBy: [{ field: "occurrenceDate", direction: "asc" }],
      },
    );
    return result.rows;
  }

  private async write(
    task: TaskOccurrenceSource,
    occurrenceDate: LocalDateString,
    completion?: TaskOccurrenceCompletion,
  ): Promise<TaskOccurrenceObservation> {
    if (this.native) return this.native.occurrence(task.path, occurrenceDate, completion);
    const file = await this.documents.ensure(occurrenceDate);
    const tracking: TaskTracking | undefined = task.task.tracking;
    const nextRaw = await this.documents.process(file.path, (raw) => {
      const materialized = materializeTaskOccurrence(raw, file.path, {
        taskId: task.id,
        taskPath: task.path,
        title: task.title,
        occurrenceDate,
        tracking,
        dayPart: taskOccurrenceDayPart(task.task.plan, this.dayParts()),
      });
      if (!completion) return materialized;
      const observation = scanTaskOccurrenceObservations(materialized, file.path).find(
        (candidate) =>
          candidate.taskId === task.id &&
          candidate.occurrenceDate === occurrenceDate,
      );
      if (!observation) {
        throw new Error(`Failed to materialize daily observation for ${task.id}.`);
      }
      return completeTaskOccurrence(
        materialized,
        file.path,
        observation,
        completion,
      );
    });
    const observations = scanTaskOccurrenceObservations(nextRaw, file.path).filter(
      (candidate) =>
        candidate.taskId === task.id &&
        candidate.occurrenceDate === occurrenceDate,
    );
    if (observations.length !== 1) {
      throw new Error(`Expected one daily observation for ${task.id} on ${occurrenceDate}.`);
    }
    return observations[0]!;
  }
}
