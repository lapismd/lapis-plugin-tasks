import * as nativeApi from "@lapis-notes/api/native-tasks";
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
    fileEditingSessions: {
      guard: vi.fn(
        async (_path: string | undefined, operation: () => Promise<unknown>) =>
          operation(),
      ),
    },
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
  it.each([
    { locale: "en-US", firstDay: 7, minimalDays: 1, available: true },
    { locale: "en-US", firstDay: 7, minimalDays: 2, available: false },
    { locale: "en-GB", firstDay: 1, minimalDays: 4, available: true },
    { locale: "en-GB", firstDay: 7, minimalDays: 4, available: false },
    { locale: "en-AU", firstDay: 1, minimalDays: 4, available: false },
  ])(
    "declares only qualified default daily context $locale/$firstDay/$minimalDays",
    async ({ available, ...format }) => {
      const declared = vi
        .spyOn(nativeApi, "nativeTaskDailyFormat")
        .mockReturnValue(
          format as ReturnType<typeof nativeApi.nativeTaskDailyFormat>,
        );
      try {
        const call = vi.fn<NativeTasks["call"]>().mockResolvedValue(status);
        const { adapter } = fixture(call);
        await adapter.activate(dayParts);
        expect(call).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            kind: "configure",
            configuration: expect.objectContaining({
              format,
              provider: available
                ? { kind: "default" }
                : expect.objectContaining({ kind: "unavailable" }),
            }),
          }),
        );
      } finally {
        declared.mockRestore();
      }
    },
  );

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
    expect(lost.message).toContain(
      `Inspect request ${request.request_id} before retrying`,
    );
    expect(lost.message).toContain("outcome is unknown");
    expect(lost.message).toContain("Response lost");
  });

  it("holds the existing single-file guard while reading and admitting native mutation", async () => {
    const order: string[] = [];
    const { adapter, app } = fixture(async () => {
      order.push("admit");
      return {
        kind: "snapshot",
        snapshot: { path: "Task.md", text: raw, version: "a".repeat(64) },
      };
    });
    vi.spyOn(app.vault, "read").mockImplementation(async () => {
      order.push("read");
      return raw;
    });
    vi.spyOn(app.fileEditingSessions, "guard").mockImplementation(
      async (path, operation) => {
        expect(path).toBe("Task.md");
        order.push("yield");
        try {
          return await operation();
        } finally {
          order.push("rearm");
        }
      },
    );
    await adapter.mutate("Task.md", {
      type: "cancel",
      at: "2026-10-26T09:00:00Z",
    });
    expect(order).toEqual(["yield", "read", "admit", "rearm"]);
  });

  it("persists lifecycle identity before the all-file guard and retains protection through failed admission", async () => {
    const order: string[] = [];
    const { app } = fixture(async () => {
      order.push("admit");
      throw new Error("Blocked native write");
    });
    vi.spyOn(app.vault, "read").mockImplementation(async () => {
      order.push("read");
      return raw;
    });
    vi.spyOn(app.fileEditingSessions, "guard").mockImplementation(
      async (path, operation) => {
        expect(path).toBeUndefined();
        order.push("yield");
        try {
          return await operation();
        } finally {
          order.push("rearm");
        }
      },
    );
    const adapter = new NativeTaskAdapter(app, {
      remember: async () => {
        order.push("persist");
      },
      settled: async () => {},
    });
    await expect(
      adapter.lifecycle("Task.md", {
        type: "skip",
        at: "2026-10-26T09:00:00Z",
        localDate: "2026-10-26",
      }),
    ).rejects.toThrow("Blocked native write");
    expect(order).toEqual(["persist", "yield", "read", "admit", "rearm"]);
  });

  it("keeps a local guard refusal outside unknown native outcomes and never admits work", async () => {
    const call = vi.fn<NativeTasks["call"]>();
    const { adapter, app } = fixture(call);
    const blocked = new Error("An editor has an unresolved write conflict");
    vi.spyOn(app.fileEditingSessions, "guard").mockRejectedValue(blocked);
    await expect(
      adapter.lifecycle("Task.md", {
        type: "skip",
        at: "2026-10-26T09:00:00Z",
        localDate: "2026-10-26",
      }),
    ).rejects.toBe(blocked);
    expect(blocked).not.toHaveProperty("uncertain");
    expect(blocked.message).not.toContain("outcome is unknown");
    expect(call).not.toHaveBeenCalled();
    expect(app.vault.read).not.toHaveBeenCalled();
  });

  it("guards explicit journal retry but leaves read-only inspection outside mutation handoff", async () => {
    const { adapter, app } = fixture(async () => ({
      kind: "operation",
      operation: null,
    }));
    expect(await adapter.retry("retained")).toBeNull();
    expect(app.fileEditingSessions.guard).toHaveBeenCalledExactlyOnceWith(
      undefined,
      expect.any(Function),
    );
    expect(await adapter.inspect("retained")).toBeNull();
    expect(app.fileEditingSessions.guard).toHaveBeenCalledTimes(1);
  });

  it("persists the lifecycle reference before admission and retains it on response loss", async () => {
    const order: string[] = [];
    const call = vi.fn<NativeTasks["call"]>().mockImplementation(async () => {
      order.push("submit");
      throw new Error("Response lost");
    });
    const { app } = fixture(call);
    const recovery = {
      remember: vi.fn(async () => {
        order.push("persist");
      }),
      settled: vi.fn(async () => {}),
    };
    const adapter = new NativeTaskAdapter(app, recovery);
    await expect(
      adapter.lifecycle("Task.md", {
        type: "skip",
        at: "2026-10-26T09:00:00Z",
        localDate: "2026-10-26",
      }),
    ).rejects.toThrow("Response lost");
    expect(order).toEqual(["persist", "submit"]);
    expect(recovery.remember).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: expect.any(String),
        path: "Task.md",
        action: {
          type: "skip",
          at: "2026-10-26T09:00:00Z",
          localDate: "2026-10-26",
        },
      }),
    );
    expect(recovery.settled).not.toHaveBeenCalled();
  });

  it("does not admit lifecycle work when its recovery reference cannot be persisted", async () => {
    const call = vi.fn<NativeTasks["call"]>();
    const { app } = fixture(call);
    const adapter = new NativeTaskAdapter(app, {
      remember: vi.fn(async () => {
        throw new Error("Recovery store full");
      }),
      settled: vi.fn(async () => {}),
    });
    await expect(
      adapter.lifecycle("Task.md", {
        type: "skip",
        at: "2026-10-26T09:00:00Z",
        localDate: "2026-10-26",
      }),
    ).rejects.toThrow("Recovery store full");
    expect(call).not.toHaveBeenCalled();
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
    expect(refusal.message).toBe("Native Tasks unavailable");
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
