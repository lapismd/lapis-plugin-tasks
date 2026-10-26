import type { App } from "@lapis-notes/api";
import {
  nativeTaskDailyFormat,
  type NativeTaskLifecycleAction,
  type NativeTaskMutation,
  type NativeTaskOperation,
  type NativeTaskProvider,
} from "@lapis-notes/api/native-tasks";
import type { TasksDayPartSettings } from "../tasks-settings";
import { parseTaskDocument, type ParsedTaskFile } from "./task-document";
import type {
  TaskOccurrenceCompletion,
  TaskOccurrenceObservation,
} from "./task-occurrence";
import { scanTaskOccurrenceObservations } from "./task-occurrence";

/** Thin observer: Rust owns accepted operations, bytes and projection repair. */
export class NativeTaskAdapter {
  private configurationQueue: Promise<void> = Promise.resolve();
  private disabling = false;
  constructor(private readonly app: App) {}

  activate(dayParts: TasksDayPartSettings): Promise<void> {
    this.disabling = false;
    return this.configure(dayParts);
  }

  configure(dayParts: TasksDayPartSettings): Promise<void> {
    if (this.disabling)
      return Promise.reject(new Error("Native Tasks plugin is disabling"));
    this.configurationQueue = this.configurationQueue
      .catch(() => undefined)
      .then(() => this.applyConfiguration(dayParts));
    return this.configurationQueue;
  }

  private async applyConfiguration(
    dayParts: TasksDayPartSettings,
  ): Promise<void> {
    const configuration = this.app.configuration.getConfiguration();
    const format = nativeTaskDailyFormat();
    let provider: NativeTaskProvider;
    try {
      const selected = this.app.dailyDocumentProviders.resolve();
      if (selected.id !== "lapis:daily-notes")
        throw new Error(`Daily provider ${selected.id} has no native adapter.`);
      if (
        format.locale !== "en-US" ||
        format.firstDay !== 7 ||
        format.minimalDays !== 4
      )
        throw new Error(
          `Native daily formatting is not qualified for ${format.locale} (${format.firstDay}/${format.minimalDays}).`,
        );
      provider = { kind: "default" };
    } catch (error) {
      provider = {
        kind: "unavailable",
        message: error instanceof Error ? error.message : String(error),
      };
    }
    await this.app.nativeTasks!.call({
      kind: "configure",
      configuration: {
        day_parts: dayParts,
        daily: {
          folder: configuration.get("dailyNotes.folder", "daily"),
          date_format: configuration.get("dailyNotes.dateFormat", "yyyy-LL-dd"),
        },
        format,
        provider,
      },
    });
  }

  async disable(): Promise<void> {
    this.disabling = true;
    await this.configurationQueue.catch(() => undefined);
    if (!this.app.nativeTasks!.detached) await this.app.nativeTasks!.disable();
  }

  private async source(path: string) {
    const file = this.app.vault.getFileByPath(path);
    if (!file) throw new Error(`Missing task document: ${path}`);
    const raw = await this.app.vault.read(file);
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(raw),
    );
    const expected_version = [...new Uint8Array(bytes)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return { path, expected_version };
  }

  private document(path: string, text: string): ParsedTaskFile {
    const document = parseTaskDocument(text, path);
    if (!document)
      throw new Error(`Native Task result is not a Task document: ${path}`);
    return document;
  }

  async mutate(
    path: string,
    mutation: NativeTaskMutation,
  ): Promise<ParsedTaskFile> {
    const value = await this.app.nativeTasks!.call({
      kind: "mutate",
      ...(await this.source(path)),
      mutation,
    });
    if (value.kind !== "snapshot")
      throw new Error("Invalid native Task mutation result");
    return this.document(path, value.snapshot.text);
  }

  async lifecycle(
    path: string,
    action: NativeTaskLifecycleAction,
  ): Promise<ParsedTaskFile> {
    const source = await this.source(path);
    const request_id = crypto.randomUUID();
    try {
      const value = await this.app.nativeTasks!.call({
        kind: "submit",
        request: { request_id, ...source, action },
      });
      if (value.kind !== "operation" || !value.operation)
        throw new Error("Invalid native Task lifecycle result");
      return this.document(path, value.operation.task_replacement);
    } catch (error) {
      // A lost response must retain the accepted identity for explicit inspection.
      const failure = error instanceof Error ? error : new Error(String(error));
      if (!("requestId" in failure) || !failure.requestId)
        Object.assign(failure, {
          requestId: request_id,
          uncertain:
            "uncertain" in failure && failure.uncertain === false
              ? false
              : true,
        });
      throw failure;
    }
  }

  async inspect(requestId: string): Promise<NativeTaskOperation | null> {
    const value = await this.app.nativeTasks!.call({
      kind: "inspect",
      request_id: requestId,
    });
    if (value.kind !== "operation")
      throw new Error("Invalid native Task inspection result");
    return value.operation;
  }

  async retry(requestId: string): Promise<NativeTaskOperation | null> {
    const value = await this.app.nativeTasks!.call({
      kind: "retry",
      request_id: requestId,
    });
    if (value.kind !== "operation")
      throw new Error("Invalid native Task retry result");
    return value.operation;
  }

  async occurrence(
    path: string,
    date: string,
    completion?: TaskOccurrenceCompletion,
  ): Promise<TaskOccurrenceObservation> {
    const value = await this.app.nativeTasks!.call({
      kind: "occurrence",
      ...(await this.source(path)),
      date,
      completion: completion ?? null,
    });
    if (value.kind !== "observation")
      throw new Error("Invalid native Task observation result");
    const observed = scanTaskOccurrenceObservations(
      value.document.text,
      value.document.path,
    ).filter(
      (entry) => entry.observationId === value.observation.observationId,
    );
    if (observed.length !== 1)
      throw new Error("Native Task result has no unique readable observation");
    return observed[0]!;
  }
}
