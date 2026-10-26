import type { NativeTaskLifecycleRequest } from "@lapis-notes/api/native-tasks";

/** Client inspection references only. The native operation journal owns outcomes. */
export type NativeTaskRequestReference = {
  requestId: string;
  path: string;
  action: string;
  at: string;
};

export type NativeTaskRequestIntent = Pick<
  NativeTaskLifecycleRequest,
  "request_id" | "path" | "action"
>;

export interface NativeTaskRecoveryStore {
  remember(request: NativeTaskRequestIntent): Promise<void>;
  settled(requestId: string): Promise<void>;
}

export const MAX_NATIVE_TASK_REFERENCES = 100;

export function nativeTaskReferences(
  value: unknown,
): NativeTaskRequestReference[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is NativeTaskRequestReference =>
        entry !== null &&
        typeof entry === "object" &&
        typeof entry.requestId === "string" &&
        /^[a-f0-9-]{36}$/i.test(entry.requestId) &&
        typeof entry.path === "string" &&
        entry.path.length > 0 &&
        typeof entry.action === "string" &&
        typeof entry.at === "string",
    )
    .map(({ requestId, path, action, at }) => ({
      requestId,
      path,
      action,
      at,
    }));
}

export function rememberNativeTaskRequest(
  references: NativeTaskRequestReference[],
  request: NativeTaskRequestIntent,
): NativeTaskRequestReference[] {
  if (references.some((entry) => entry.requestId === request.request_id))
    return references;
  if (references.length >= MAX_NATIVE_TASK_REFERENCES) {
    throw new Error(
      "Task recovery references are full. Use Tasks: Inspect interrupted task update before starting another update.",
    );
  }
  return [
    ...references,
    {
      requestId: request.request_id,
      path: request.path,
      action: request.action.type,
      at: request.action.at,
    },
  ];
}
