import { describe, expect, it } from "vitest";
import type { NativeTaskLifecycleRequest } from "@lapis-notes/api/native-tasks";
import { migrateTasksPluginData } from "../tasks-settings";
import {
  MAX_NATIVE_TASK_REFERENCES,
  rememberNativeTaskRequest,
} from "./native-task-recovery";

const request: NativeTaskLifecycleRequest = {
  request_id: "d5ab7890-0000-4000-8000-000000000001",
  path: "Task.md",
  expected_version: "a".repeat(64),
  action: { type: "skip", at: "2026-10-26T09:00:00Z", localDate: "2026-10-26" },
};

describe("native Task client inspection references", () => {
  it("retains the exact identity and path through the existing plugin data reload", () => {
    const references = rememberNativeTaskRequest([], request);
    const restored = migrateTasksPluginData(
      JSON.parse(
        JSON.stringify({ version: 3, nativeTaskRequests: references }),
      ),
    );
    expect(restored.nativeTaskRequests).toEqual([
      {
        requestId: request.request_id,
        path: "Task.md",
        action: "skip",
        at: request.action.at,
      },
    ]);
    expect(
      rememberNativeTaskRequest(restored.nativeTaskRequests!, request),
    ).toEqual(references);
    expect(restored.nativeTaskRequests![0]).not.toHaveProperty(
      "expected_version",
    );
    expect(restored.nativeTaskRequests![0]).not.toHaveProperty(
      "task_replacement",
    );
  });

  it("refuses a new reference at capacity without evicting unresolved identities", () => {
    const references = Array.from(
      { length: MAX_NATIVE_TASK_REFERENCES },
      (_, index) => ({
        requestId: `d5ab7890-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
        path: `Task-${index}.md`,
        action: "skip",
        at: request.action.at,
      }),
    );
    const before = structuredClone(references);
    expect(() => rememberNativeTaskRequest(references, request)).toThrow(
      "Inspect interrupted task update",
    );
    expect(references).toEqual(before);
    expect(
      migrateTasksPluginData({ nativeTaskRequests: references })
        .nativeTaskRequests,
    ).toEqual(before);
  });
});
