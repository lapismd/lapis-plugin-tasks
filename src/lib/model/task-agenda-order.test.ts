import { describe, expect, it, vi } from "vitest";
import { TaskAgendaRepository, readAgendaOrder } from "./task-agenda-order";

function setup() {
  let raw =
    "---\ntype: daily-note\ndate: 2026-08-19\ncustom: keep\n---\n\n## Journal\n\nUnchanged notes.\n";
  let exists = false;
  const ensure = vi.fn(async () => {
    exists = true;
    return { path: "daily.md" };
  });
  const store = {
    locate: async () => (exists ? { path: "daily.md" } : null),
    ensure,
    read: async () => raw,
    process: async (_path: string, mutate: (source: string) => string) =>
      (raw = mutate(raw)),
  };
  return {
    repository: new TaskAgendaRepository(store),
    store,
    ensure,
    raw: () => raw,
  };
}

describe("per-day agenda order", () => {
  it("reads without creating a note, then persists order and preserves unrelated content", async () => {
    const context = setup();
    expect(await context.repository.order("2026-08-19")).toEqual([]);
    expect(context.ensure).not.toHaveBeenCalled();
    await context.repository.reorder("2026-08-19", ["a", "hidden", "b"]);
    await context.repository.reorder("2026-08-19", ["b", "a"]);
    expect(readAgendaOrder(context.raw())).toEqual(["b", "hidden", "a"]);
    expect(context.raw()).toContain("custom: keep");
    expect(context.raw()).toContain("## Journal\n\nUnchanged notes.\n");
    expect(
      await new TaskAgendaRepository(context.store).order("2026-08-19"),
    ).toEqual(["b", "hidden", "a"]);
  });

  it("rejects a provider returning the wrong day without modifying it", async () => {
    const context = setup();
    await expect(
      context.repository.reorder("2026-08-20", ["a"]),
    ).rejects.toThrow("different date");
    expect(context.raw()).not.toContain("agendaOrder");
  });
});
