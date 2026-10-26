import type { AppDatabase } from "@lapis-notes/api/app-database";
import {
  MAX_NATIVE_TASK_REFERENCES,
  nativeTaskReferences,
  rememberNativeTaskRequest,
  type NativeTaskRecoveryStore,
  type NativeTaskRequestIntent,
  type NativeTaskRequestReference,
} from "./native-task-recovery";

const KEY = "plugin:tasks:native-request-references:v1";
const MAX_ATTEMPTS = 8;
type Database = Pick<AppDatabase, "getMeta" | "transactMeta">;

/** Inspection hints only. The native journal remains the operation authority. */
export class NativeTaskReferenceStore implements NativeTaskRecoveryStore {
  constructor(private readonly database: Database) {}

  private decode(value: unknown): NativeTaskRequestReference[] {
    if (value === undefined) return [];
    const references = nativeTaskReferences(value);
    if (
      !Array.isArray(value) ||
      references.length !== value.length ||
      references.length > MAX_NATIVE_TASK_REFERENCES ||
      new Set(references.map(({ requestId }) => requestId)).size !==
        references.length
    ) {
      throw new Error(
        "Retained Task recovery references are invalid; inspect storage before updating tasks.",
      );
    }
    return references;
  }

  async list(): Promise<NativeTaskRequestReference[]> {
    return this.decode(await this.database.getMeta(KEY));
  }

  remember(request: NativeTaskRequestIntent): Promise<void> {
    return this.update((references) =>
      rememberNativeTaskRequest(references, request),
    );
  }

  settled(requestId: string): Promise<void> {
    return this.forget(requestId);
  }

  forget(requestId: string): Promise<void> {
    return this.update((references) =>
      references.filter((reference) => reference.requestId !== requestId),
    );
  }

  importLegacy(references: NativeTaskRequestReference[]): Promise<void> {
    return this.update((current) => {
      const merged = [...current];
      for (const reference of nativeTaskReferences(references)) {
        if (merged.some(({ requestId }) => requestId === reference.requestId))
          continue;
        if (merged.length >= MAX_NATIVE_TASK_REFERENCES)
          throw new Error(
            "Task recovery references are full. Use Tasks: Inspect interrupted task update before starting another update.",
          );
        merged.push(reference);
      }
      return merged;
    });
  }

  private async update(
    change: (
      references: NativeTaskRequestReference[],
    ) => NativeTaskRequestReference[],
  ): Promise<void> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const previous = await this.database.getMeta(KEY);
      const current = this.decode(previous);
      const next = change(current);
      if (JSON.stringify(next) === JSON.stringify(current)) return;
      const { applied } = await this.database.transactMeta({
        checks: [
          previous === undefined
            ? { key: KEY, exists: false }
            : { key: KEY, exists: true, value: previous },
        ],
        mutations: [{ key: KEY, value: next }],
      });
      if (applied) return;
    }
    throw new Error(
      "Task recovery references changed repeatedly; inspect interrupted updates before trying again.",
    );
  }
}
