import type { App } from "@lapis-notes/api";
import { describe, expect, it, vi } from "vitest";
import { resolveTaskMarkdownTargets } from "./task-markdown-targets";
import { scanMarkdownTaskRuns } from "./task-list-items";

describe("Markdown task targets", () => {
  it("resolves cold linked files and deduplicates repeated reads", async () => {
    const file = { path: "tasks/one.md", basename: "one" };
    const cachedRead = vi.fn(
      async () =>
        "---\ntype: task\nid: one\ntask:\n  status: open\n  start: anytime\n---\n# One\n",
    );
    const getFileCache = vi.fn(() => null);
    const app = {
      metadataCache: {
        getFirstLinkpathDest: () => file,
        getFileCache,
      },
      vault: { cachedRead },
    } as unknown as App;
    const source =
      "---\ntype: task-list\nid: list\nlist:\n  status: active\n---\n# List\n\n- [One](../tasks/one.md)\n- [Again](../tasks/one.md)\n";
    const resolve = await resolveTaskMarkdownTargets(
      app,
      source,
      "lists/list.md",
    );
    const runs = scanMarkdownTaskRuns(source, "lists/list.md", resolve);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.entries.map((entry) => entry.targetId)).toEqual([
      "one",
      "one",
    ]);
    expect(cachedRead).toHaveBeenCalledTimes(1);
    expect(getFileCache).not.toHaveBeenCalled();
  });

  it("keeps missing and non-task links out of rich task runs", async () => {
    const app = {
      metadataCache: {
        getFirstLinkpathDest: (href: string) =>
          href === "missing.md" ? null : { path: "note.md", basename: "note" },
      },
      vault: { cachedRead: async () => "# Ordinary note\n" },
    } as unknown as App;
    const source =
      "---\ntype: task-list\nid: list\nlist:\n  status: active\n---\n# List\n\n- [Missing](missing.md)\n- [Note](note.md)\n";
    const resolve = await resolveTaskMarkdownTargets(app, source, "list.md");
    expect(scanMarkdownTaskRuns(source, "list.md", resolve)).toEqual([]);
  });
});
