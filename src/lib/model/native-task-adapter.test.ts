import type { App } from "@lapis-notes/api";
import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import {
  NativeTasksSession,
  type NativeTasks,
  type NativeTaskValue,
} from "@lapis-notes/api/native-tasks";
import { describe, expect, it, vi } from "vitest";
import { NativeTaskAdapter } from "./native-task-adapter";
import { TaskRepository } from "./task-repository";
import { TaskOccurrenceRepository } from "./task-occurrence-repository";

const raw =
  "---\ntype: task\nid: read\ntask:\n  status: open\n  inbox: false\n  start: anytime\n---\n\n# Read\n";
const status: NativeTaskValue = {
  kind: "status",
  status: { enabled: true, configuration: null, tracked: null },
};
const dayParts = { afternoonStartsAt: "12:00", eveningStartsAt: "17:00" };
function fixture(call: NativeTasks["call"]) {
  const nativeTasks = new NativeTasksSession({ call });
  const app = {
    nativeTasks,
    configuration: {
      getConfiguration: () => ({
        get: (_key: string, fallback: unknown) => fallback,
      }),
    },
    dailyDocumentProviders: { resolve: () => ({ id: "lapis:daily-notes" }) },
    vault: {
      getFileByPath: (path: string) => ({ path }),
      read: vi.fn(async () => raw),
    },
  } as unknown as App;
  return { app, nativeTasks, adapter: new NativeTaskAdapter(app) };
}

describe("native Task source adapter", () => {
  it("delegates guarded mutation bytes without renderer file or projection writes", async () => {
    const call = vi.fn<NativeTasks["call"]>().mockResolvedValue({
      kind: "snapshot",
      snapshot: {
        path: "Task.md",
        text: raw.replace("status: open", "status: canceled"),
        version: "b".repeat(64),
      },
    });
    const { adapter } = fixture(call);
    const files = {
      read: vi.fn(async () => raw),
      write: vi.fn(),
      process: vi.fn(),
    };
    const database = new MemoryAppDatabase("native-adapter");
    const publish = vi.spyOn(database, "replaceProjectionSource");
    const repository = new TaskRepository(
      database,
      files,
      () => new Date("2026-10-26T09:00:00Z"),
      undefined,
      adapter,
    );
    const result = await repository.cancel("Task.md", "2026-10-26T09:00:00Z");
    expect(result.status).toBe("canceled");
    expect(call).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        kind: "mutate",
        path: "Task.md",
        expected_version: expect.stringMatching(/^[a-f0-9]{64}$/),
        mutation: { type: "cancel", at: "2026-10-26T09:00:00Z" },
      }),
    );
    expect(files.write).not.toHaveBeenCalled();
    expect(files.process).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    await repository.refreshEffectiveOccurrences("2026-10-26");
    expect(files.read).not.toHaveBeenCalled();
  });

  it("retains an uncertain lifecycle identity and never retries or falls back", async () => {
    const lost = new Error("Response lost");
    const call = vi.fn<NativeTasks["call"]>().mockRejectedValue(lost);
    const { adapter } = fixture(call);
    await expect(
      adapter.lifecycle("Task.md", {
        type: "complete",
        at: "2026-10-26T09:00:00Z",
        localDate: "2026-10-26",
        trackedValue: null,
      }),
    ).rejects.toMatchObject({
      requestId: expect.stringMatching(/^[a-f0-9-]{36}$/),
      uncertain: true,
    });
    expect(call).toHaveBeenCalledTimes(1);
    const request = (
      call.mock.calls[0]![0] as Extract<
        Parameters<NativeTasks["call"]>[0],
        { kind: "submit" }
      >
    ).request;
    expect(lost).toHaveProperty("requestId", request.request_id);
  });

  it("keeps declared admission refusal known while retaining the submitted identity", async () => {
    const refusal = Object.assign(new Error("Native Tasks unavailable"), {
      code: "UNSUPPORTED",
      uncertain: false,
    });
    const call = vi.fn<NativeTasks["call"]>().mockRejectedValue(refusal);
    const { adapter } = fixture(call);
    await expect(
      adapter.lifecycle("Task.md", {
        type: "skip",
        at: "2026-10-26T09:00:00Z",
        localDate: "2026-10-26",
      }),
    ).rejects.toMatchObject({
      code: "UNSUPPORTED",
      uncertain: false,
      requestId: expect.stringMatching(/^[a-f0-9-]{36}$/),
    });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("preserves known failure identity and partial state", async () => {
    const failure = {
      name: "TaskMutationError",
      code: "stale-task",
      message: "Retained partial",
      parts: ["task"],
      request_id: "known",
      uncertain: false,
      operation: null,
    };
    const call = vi
      .fn<NativeTasks["call"]>()
      .mockResolvedValue({ kind: "failure", failure });
    const { adapter } = fixture(call);
    await expect(
      adapter.lifecycle("Task.md", {
        type: "skip",
        at: "2026-10-26T09:00:00Z",
        localDate: "2026-10-26",
      }),
    ).rejects.toMatchObject({
      name: failure.name,
      code: failure.code,
      requestId: "known",
      uncertain: false,
      parts: ["task"],
    });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("serializes configuration before explicit disable and supports later activation", async () => {
    let release!: () => void;
    const block = new Promise<void>((resolve) => {
      release = resolve;
    });
    const call = vi
      .fn<NativeTasks["call"]>()
      .mockImplementation(async (command) => {
        if (command.kind === "configure") await block;
        return status;
      });
    const { adapter } = fixture(call);
    const configuring = adapter.activate(dayParts);
    await Promise.resolve();
    await Promise.resolve();
    const disabling = adapter.disable();
    await expect(adapter.configure(dayParts)).rejects.toThrow(/disabling/);
    expect(call.mock.calls.map(([command]) => command.kind)).toEqual([
      "configure",
    ]);
    release();
    await configuring;
    await disabling;
    expect(call.mock.calls.map(([command]) => command.kind)).toEqual([
      "configure",
      "disable",
    ]);
    await adapter.activate(dayParts);
    expect(call.mock.calls.map(([command]) => command.kind)).toEqual([
      "configure",
      "disable",
      "configure",
    ]);
  });

  it("passive detach never disables native work", async () => {
    const call = vi.fn<NativeTasks["call"]>().mockResolvedValue(status);
    const { adapter, nativeTasks } = fixture(call);
    await nativeTasks.detach();
    await adapter.disable();
    expect(call).not.toHaveBeenCalled();
  });

  it("declares unavailable providers and never calls their renderer callbacks", async () => {
    const call = vi.fn<NativeTasks["call"]>().mockResolvedValue(status);
    const { adapter, app } = fixture(call);
    vi.spyOn(app.dailyDocumentProviders, "resolve").mockReturnValue({
      id: "custom",
      ensure: vi.fn(),
      locate: vi.fn(),
    });
    await adapter.activate(dayParts);
    expect(call).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "configure",
        configuration: expect.objectContaining({
          provider: {
            kind: "unavailable",
            message: "Daily provider custom has no native adapter.",
          },
        }),
      }),
    );
  });

  it("routes daily observations through source-derived native work without ensuring a renderer daily file", async () => {
    const call = vi
      .fn<NativeTasks["call"]>()
      .mockRejectedValue(new Error("native provider refused"));
    const { adapter } = fixture(call);
    const documents = { ensure: vi.fn(), process: vi.fn() };
    const occurrences = new TaskOccurrenceRepository(
      new MemoryAppDatabase("native-occurrence"),
      documents,
      () => dayParts,
      adapter,
    );
    await expect(
      occurrences.ensure(
        { id: "read", path: "Task.md", title: "Read", task: {} },
        "2026-10-26",
      ),
    ).rejects.toThrow("native provider refused");
    expect(documents.ensure).not.toHaveBeenCalled();
    expect(documents.process).not.toHaveBeenCalled();
    expect(call).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        kind: "occurrence",
        path: "Task.md",
        date: "2026-10-26",
        completion: null,
      }),
    );
  });
});
