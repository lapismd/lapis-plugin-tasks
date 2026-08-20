import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import { describe, expect, it } from "vitest";
import { parseTaskDocument } from "./task-document";
import { indexTaskDocument } from "./task-index";
import {
  createMemoryTaskFileStore,
  TaskRepository,
} from "./task-repository";

const TODAY = "2026-08-20";

const FILES: Record<string, string> = {
  "lists/home.md": `---
type: task-list
id: list_home
title: Household
list:
  status: active
---
# Home

## Items
- [Buy filter](../buy.md)
`,
  "buy.md": `---
type: task
id: t_buy
task:
  status: open
  inbox: true
  start: anytime
  plan:
    date: 2026-08-19
    at: anytime
---
# Buy filter

## Checklist
- [x] Measure the opening
- [ ] Order the filter

## Subtasks
- [Replace cartridge](./child.md)
`,
  "child.md": `---
type: task
id: t_child
task:
  status: open
  start: anytime
---
# Replace cartridge
`,
  "later.md": `---
type: task
id: t_later
task:
  status: open
  start: someday
---
# Later
`,
  "upcoming.md": `---
type: task
id: t_upcoming
task:
  status: open
  start: anytime
  deadline: 2026-08-24
---
# Book flights
`,
  "done.md": `---
type: task
id: t_done
task:
  status: completed
  completedAt: 2026-08-18T12:00:00Z
  start: anytime
---
# Submitted
`,
  "canceled.md": `---
type: task
id: t_canceled
task:
  status: canceled
  start: anytime
---
# Canceled
`,
};

async function openRepository() {
  const database = new MemoryAppDatabase("tasks-repo");
  await database.open();
  const files = createMemoryTaskFileStore(FILES);
  for (const [path, raw] of Object.entries(FILES)) {
    const document = parseTaskDocument(raw, path);
    if (!document) throw new Error(`Invalid fixture ${path}`);
    await indexTaskDocument(database, document);
  }
  return { database, files, repository: new TaskRepository(database, files) };
}

describe("TaskRepository", () => {
  it("queries derived views from the shared projection", async () => {
    const { repository } = await openRepository();
    await expect(repository.inbox(TODAY)).resolves.toMatchObject([
      { id: "t_buy", title: "Buy filter" },
    ]);
    await expect(repository.today(TODAY)).resolves.toMatchObject([
      { id: "t_buy" },
    ]);
    await expect(repository.review(TODAY)).resolves.toMatchObject([
      { id: "t_buy" },
    ]);
    await expect(repository.anytime(TODAY)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "t_child" })]),
    );
    await expect(repository.upcoming(TODAY)).resolves.toMatchObject([
      { id: "t_upcoming" },
    ]);
    await expect(repository.someday()).resolves.toMatchObject([{ id: "t_later" }]);
    await expect(repository.completed()).resolves.toMatchObject([{ id: "t_done" }]);
    await expect(repository.logbook()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "t_done" }),
        expect.objectContaining({ id: "t_canceled" }),
      ]),
    );
  });

  it("walks children and the structural parent", async () => {
    const { repository } = await openRepository();
    await expect(repository.children("buy.md")).resolves.toMatchObject([
      { id: "t_child" },
    ]);
    await expect(repository.parent("buy.md")).resolves.toMatchObject({
      id: "list_home",
    });
    await expect(repository.items("list_home")).resolves.toMatchObject([
      { id: "t_buy" },
    ]);
  });

  it("keeps a front-matter list title authoritative when renamed", async () => {
    const { repository, files } = await openRepository();
    await expect(repository.get("list_home")).resolves.toMatchObject({
      title: "Household",
    });

    await repository.renameList(
      "lists/home.md",
      "Home projects",
      "2026-08-20T11:00:00Z",
    );

    const raw = await files.read("lists/home.md");
    expect(raw).toContain("title: Home projects");
    expect(raw).toContain("# Home projects");
    await expect(repository.get("list_home")).resolves.toMatchObject({
      title: "Home projects",
    });
  });

  it("guards and reprojects one exact Items section", async () => {
    const { repository, files } = await openRepository();
    const before = await files.read("lists/home.md");
    const [section] = await repository.getTaskListItemsSections("list_home");
    expect(section?.entries.map((entry) => entry.label)).toEqual(["Buy filter"]);

    const next = await repository.replaceTaskListItemsSection(
      "list_home",
      section!,
      [{ label: "Replace cartridge", target: "../child.md" }],
    );
    expect(next.raw).toBe(
      before.replace(
        "- [Buy filter](../buy.md)",
        "- [Replace cartridge](../child.md)",
      ),
    );
    await expect(repository.items("list_home")).resolves.toMatchObject([
      { id: "t_child" },
    ]);
  });

  it("rejects a stale Items section without rewriting prose", async () => {
    const { repository, files } = await openRepository();
    const [section] = await repository.getTaskListItemsSections("list_home");
    const changed = (await files.read("lists/home.md")).replace(
      "# Home",
      "# Home\n\nAuthored note.",
    );
    await files.write("lists/home.md", changed.replace("Buy filter", "Changed"));
    await expect(
      repository.replaceTaskListItemsSection("list_home", section!, []),
    ).rejects.toMatchObject({ code: "stale-section" });
    await expect(files.read("lists/home.md")).resolves.toContain("Authored note.");
  });

  it("writes a file mutation and upserts the same parse", async () => {
    const { repository, files } = await openRepository();
    const next = await repository.complete("buy.md", "2026-08-20T09:00:00Z");
    expect(next.status).toBe("completed");
    expect(next.inbox).toBe(false);
    await expect(repository.inbox(TODAY)).resolves.toEqual([]);
    await expect(repository.completed()).resolves.toMatchObject([
      { id: "t_buy" },
      { id: "t_done" },
    ]);
    const raw = await files.read("buy.md");
    expect(raw).toContain("status: completed");
    expect(raw).not.toContain("inbox: true");
  });

  it("lazily loads and safely reprojects one checklist marker", async () => {
    const { repository, files } = await openRepository();
    const before = await files.read("buy.md");
    const document = await repository.getTaskDocument("t_buy");
    expect(document.checklist).toEqual([
      { text: "Measure the opening", checked: true, position: 0 },
      { text: "Order the filter", checked: false, position: 1 },
    ]);

    const next = await repository.setChecklistItemChecked(
      "t_buy",
      1,
      "Order the filter",
      true,
    );
    expect(await files.read("buy.md")).toBe(
      before.replace("- [ ] Order the filter", "- [x] Order the filter"),
    );
    expect(next.checklist.every((item) => item.checked)).toBe(true);
    await expect(repository.get("t_buy")).resolves.toMatchObject({
      checklistTotal: 2,
      checklistCompleted: 2,
    });
  });

  it("rejects stale checklist positions without changing another item", async () => {
    const { repository, files } = await openRepository();
    const before = await files.read("buy.md");
    await expect(
      repository.setChecklistItemChecked("buy.md", 0, "Order the filter", false),
    ).rejects.toMatchObject({ code: "stale-checklist-item" });
    await expect(files.read("buy.md")).resolves.toBe(before);
  });

  it("reopens, retitles, creates, and removes Markdown-backed tasks", async () => {
    const { repository, files } = await openRepository();
    await repository.complete("buy.md", "2026-08-20T09:00:00Z");
    await repository.reopen("buy.md", "2026-08-20T10:00:00Z");
    await expect(repository.get("t_buy")).resolves.toMatchObject({
      status: "open",
    });
    await repository.setTitle("buy.md", "Buy a new filter", "2026-08-20T11:00:00Z");
    expect(await files.read("buy.md")).toContain("# Buy a new filter");
    const created = await repository.create({
      path: "inbox/new.md",
      title: "New capture",
      at: "2026-08-20T12:00:00Z",
    });
    expect(created.title).toBe("New capture");
    expect(created.inbox).toBe(true);
    await repository.remove("inbox/new.md");
    await expect(repository.get(created.id)).resolves.toBeNull();
  });

  it("plans a someday task without silently rolling dates", async () => {
    const { repository } = await openRepository();
    const next = await repository.planFor(
      "later.md",
      { date: "2026-08-22", at: "anytime" },
      "2026-08-20T12:00:00Z",
    );
    expect(next.startKind).toBe("anytime");
    expect(next.planDate).toBe("2026-08-22");
    await expect(repository.someday()).resolves.toEqual([]);
    await expect(repository.upcoming(TODAY)).resolves.toMatchObject([
      { id: "t_later" },
      { id: "t_upcoming" },
    ]);
  });
});
