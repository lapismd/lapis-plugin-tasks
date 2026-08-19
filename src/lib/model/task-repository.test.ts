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
