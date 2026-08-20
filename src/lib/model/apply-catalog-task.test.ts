import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import { describe, expect, it } from "vitest";
import { applyCatalogTaskToRepository, createCatalogTaskInRepository } from "./apply-catalog-task";
import { catalogTaskFromSummary } from "./catalog-adapter";
import { parseTaskDocument } from "./task-document";
import { indexTaskDocument } from "./task-index";
import { createMemoryTaskFileStore, TaskRepository } from "./task-repository";
import { taskForTasksMarkdownMutation } from "../task-list-surface";

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
  "lists/applications.md": `---
type: task-list
id: list-applications
list:
  status: active
---
# Applications

## Items
`,
  "buy.md": `---
type: task
id: t_buy
task:
  status: open
  inbox: true
  start: anytime
---
# Buy filter
`,
};

async function openRepository() {
  const database = new MemoryAppDatabase("apply-catalog");
  await database.open();
  const files = createMemoryTaskFileStore(FILES);
  for (const [path, raw] of Object.entries(FILES)) {
    const document = parseTaskDocument(raw, path);
    if (!document) throw new Error(`Invalid fixture ${path}`);
    await indexTaskDocument(database, document);
  }
  return { files, repository: new TaskRepository(database, files) };
}

describe("applyCatalogTaskToRepository", () => {
  it("does not remove a list link when a rich Items row edits a child field", async () => {
    const { repository, files } = await openRepository();
    const projected = catalogTaskFromSummary((await repository.get("t_buy"))!);
    const canonical = {
      ...projected,
      listId: "list_home",
      areas: ["Home"],
    };

    await applyCatalogTaskToRepository(
      repository,
      {
        ...taskForTasksMarkdownMutation(projected, [canonical]),
        title: "Buy a better filter",
        updatedAt: "2026-08-20T10:00:00Z",
      },
      canonical,
    );

    expect(await files.read("buy.md")).toContain("# Buy a better filter");
    expect(await files.read("lists/home.md")).toContain(
      "- [Buy filter](../buy.md)",
    );
  });

  it("maps planner patches onto file-backed repository mutations", async () => {
    const { repository, files } = await openRepository();
    const previous = catalogTaskFromSummary((await repository.get("t_buy"))!);
    await applyCatalogTaskToRepository(
      repository,
      {
        ...previous,
        inbox: false,
        when: "today",
        start: "anytime",
        planDate: "2026-08-20",
        planAt: "anytime",
        deadline: "2026-08-21",
        updatedAt: "2026-08-20T12:00:00Z",
      },
      previous,
    );
    const planned = await files.read("buy.md");
    expect(planned).toContain("inbox: false");
    expect(planned).toContain("date: 2026-08-20");
    expect(planned).toContain("deadline: 2026-08-21");

    await applyCatalogTaskToRepository(
      repository,
      {
        ...catalogTaskFromSummary((await repository.get("t_buy"))!),
        planDate: "2026-08-20",
        planAt: "morning",
        updatedAt: "2026-08-20T12:30:00Z",
      },
      catalogTaskFromSummary((await repository.get("t_buy"))!),
    );
    expect(await files.read("buy.md")).toContain("at: morning");

    const beforeClockTime = catalogTaskFromSummary(
      (await repository.get("t_buy"))!,
    );
    await applyCatalogTaskToRepository(
      repository,
      {
        ...beforeClockTime,
        planDate: "2026-08-20",
        planAt: "14:45",
        updatedAt: "2026-08-20T12:40:00Z",
      },
      beforeClockTime,
    );
    expect(await files.read("buy.md")).toContain("at: 14:45");

    const beforeRepeat = catalogTaskFromSummary((await repository.get("t_buy"))!);
    await applyCatalogTaskToRepository(
      repository,
      {
        ...beforeRepeat,
        repeat: {
          strategy: "rolling",
          frequency: "weekly",
          interval: 2,
          anchor: "completion",
          resetChecklist: true,
        },
        updatedAt: "2026-08-20T12:45:00Z",
      },
      beforeRepeat,
    );
    const repeated = await files.read("buy.md");
    expect(repeated).toContain("frequency: weekly");
    expect(repeated).toContain("interval: 2");
    expect(repeated).toContain("anchor: completion");
    expect(repeated).toContain("resetChecklist: true");
    const beforeClearRepeat = catalogTaskFromSummary(
      (await repository.get("t_buy"))!,
    );
    await applyCatalogTaskToRepository(
      repository,
      {
        ...beforeClearRepeat,
        repeat: undefined,
        updatedAt: "2026-08-20T12:50:00Z",
      },
      beforeClearRepeat,
    );

    await applyCatalogTaskToRepository(
      repository,
      {
        ...previous,
        status: "done",
        completedAt: "2026-08-20T13:00:00Z",
        updatedAt: "2026-08-20T13:00:00Z",
      },
      catalogTaskFromSummary((await repository.get("t_buy"))!),
    );
    expect(await files.read("buy.md")).toContain("status: completed");

    await applyCatalogTaskToRepository(
      repository,
      {
        ...catalogTaskFromSummary((await repository.get("t_buy"))!),
        status: "canceled",
        completedAt: undefined,
        updatedAt: "2026-08-20T13:30:00Z",
      },
      catalogTaskFromSummary((await repository.get("t_buy"))!),
    );
    expect(await files.read("buy.md")).toContain("status: canceled");

    const created = await createCatalogTaskInRepository(
      repository,
      {
        title: "Write notes",
        view: "today",
        area: "list_home",
        order: 1024,
      },
      { existingPaths: ["buy.md", "lists/home.md"], now: new Date("2026-08-20T14:00:00Z") },
    );
    expect(created.sourcePath).toBe("inbox/write-notes.md");
    const createdRaw = await files.read("inbox/write-notes.md");
    expect(createdRaw).toContain("# Write notes");
    expect(createdRaw).toContain("date: 2026-08-20");
    expect(await files.read("lists/home.md")).toContain("../inbox/write-notes.md");

    const assigned = await createCatalogTaskInRepository(
      repository,
      {
        title: "New project work",
        view: "inbox",
        area: "Projects",
        order: 2048,
      },
      {
        existingPaths: ["buy.md", "lists/home.md", "inbox/write-notes.md"],
        now: new Date("2026-08-20T15:00:00Z"),
      },
    );
    expect(assigned.listId).toBe("Projects");
    expect(await files.read("lists/projects.md")).toContain("# Projects");
    expect(await files.read("lists/projects.md")).toContain(
      "../inbox/new-project-work.md",
    );
  });

  it("attaches a task to Applications instead of minting list-list-applications", async () => {
    const { repository, files } = await openRepository();
    const created = await createCatalogTaskInRepository(
      repository,
      {
        title: "Prep resume",
        view: "today",
        area: "list-applications",
        order: 1024,
      },
      {
        existingPaths: Object.keys(FILES),
        now: new Date("2026-08-20T16:00:00Z"),
      },
    );
    expect(created.listId).toBe("list-applications");
    expect(await files.read("lists/applications.md")).toContain(
      "../inbox/prep-resume.md",
    );
    await expect(files.read("lists/list-applications.md")).rejects.toThrow();
    const lists = await repository.lists();
    expect(lists.map((list) => list.id)).toEqual(
      expect.arrayContaining(["list-applications"]),
    );
    expect(lists.some((list) => list.id === "list-list-applications")).toBe(
      false,
    );
  });
});
