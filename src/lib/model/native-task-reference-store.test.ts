import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import { describe, expect, it, vi } from "vitest";
import { NativeTaskReferenceStore } from "./native-task-reference-store";
import { nativeTaskReferences } from "./native-task-recovery";

const reference = (id: number) => ({
  requestId: `d5ab7890-0000-4000-8000-${String(id).padStart(12, "0")}`,
  path: `Task-${id}.md`,
  action: "skip",
  at: "2026-10-26T09:00:00Z",
});
const request = (id: number) => {
  const value = reference(id);
  return {
    request_id: value.requestId,
    path: value.path,
    action: { type: "skip" as const, at: value.at, localDate: "2026-10-26" },
  };
};

describe("native Task metadata inspection references", () => {
  it("reads shared references afresh after another App saves ordinary plugin settings", async () => {
    const database = new MemoryAppDatabase("shared-task-references");
    const first = new NativeTaskReferenceStore(database);
    const second = new NativeTaskReferenceStore(database);
    expect(await second.list()).toEqual([]);
    await first.remember(request(1));
    await database.setMeta("plugin:tasks:settings", { planner: "collapsed" });
    expect(await second.list()).toEqual([reference(1)]);
    expect(await new NativeTaskReferenceStore(database).list()).toEqual([
      reference(1),
    ]);
  });

  it("uses atomic capacity checks for simultaneous Apps without eviction", async () => {
    const database = new MemoryAppDatabase("task-reference-capacity");
    const first = new NativeTaskReferenceStore(database);
    const second = new NativeTaskReferenceStore(database);
    await first.importLegacy(
      Array.from({ length: 99 }, (_, id) => reference(id)),
    );
    const attempts = await Promise.allSettled([
      first.remember(request(100)),
      second.remember(request(101)),
    ]);
    expect(
      attempts.filter(({ status }) => status === "fulfilled"),
    ).toHaveLength(1);
    const refused = attempts.find(({ status }) => status === "rejected");
    expect(refused).toMatchObject({
      reason: { message: expect.stringContaining("references are full") },
    });
    const retained = await first.list();
    expect(retained).toHaveLength(100);
    expect(retained).toEqual(
      expect.arrayContaining(
        Array.from({ length: 99 }, (_, id) => reference(id)),
      ),
    );
  });

  it("forgets and settles only its identity while preserving a newer App reference", async () => {
    const database = new MemoryAppDatabase("task-reference-removal");
    const first = new NativeTaskReferenceStore(database);
    const second = new NativeTaskReferenceStore(database);
    await first.remember(request(1));
    const stale = await first.list();
    await second.remember(request(2));
    await first.forget(stale[0]!.requestId);
    expect(await first.list()).toEqual([reference(2)]);
    await Promise.all([
      first.remember(request(3)),
      second.settled(reference(2).requestId),
    ]);
    expect(await first.list()).toEqual([reference(3)]);
  });

  it("retains existing metadata identities when importing legacy plugin data", async () => {
    const database = new MemoryAppDatabase("task-reference-import");
    const store = new NativeTaskReferenceStore(database);
    await store.remember(request(1));
    await store.importLegacy([reference(2), reference(1)]);
    await store.importLegacy([reference(2)]);
    expect(await store.list()).toEqual([reference(1), reference(2)]);
  });

  it("rejects failed storage and bounded CAS contention instead of claiming persistence", async () => {
    const database = new MemoryAppDatabase("task-reference-storage");
    const store = new NativeTaskReferenceStore(database);
    const transact = vi.spyOn(database, "transactMeta");
    transact.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(store.remember(request(1))).rejects.toThrow(
      "database unavailable",
    );
    expect(await store.list()).toEqual([]);
    transact.mockResolvedValue({ applied: false });
    await expect(store.remember(request(2))).rejects.toThrow(
      "changed repeatedly",
    );
    expect(transact.mock.calls.length).toBeLessThanOrEqual(10);
    expect(await store.list()).toEqual([]);
  });

  it("refuses malformed retained state without overwriting it", async () => {
    const database = new MemoryAppDatabase("task-reference-malformed");
    const store = new NativeTaskReferenceStore(database);
    await store.remember(request(1));
    const get = vi
      .spyOn(database, "getMeta")
      .mockResolvedValue([{ arbitrary: true }]);
    const transact = vi.spyOn(database, "transactMeta");
    await expect(store.remember(request(2))).rejects.toThrow("invalid");
    expect(transact).not.toHaveBeenCalled();
    get.mockRestore();
    expect(await store.list()).toEqual([reference(1)]);
  });

  it("retains only inspection fields when reading a legacy reference", () => {
    expect(
      nativeTaskReferences([
        { ...reference(1), task_replacement: "private bytes" },
      ]),
    ).toEqual([reference(1)]);
  });
});
