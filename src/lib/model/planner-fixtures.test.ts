import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import { describe, expect, it } from "vitest";
import {
  catalogTasksFromPlannerFixtures,
  parsePlannerFixtures,
  plannerMarkdownFixtures,
  PLANNER_FIXTURE_TODAY,
} from "./planner-fixtures";
import { indexTaskDocument } from "./task-index";
import { createMemoryTaskFileStore, TaskRepository } from "./task-repository";
import { serializeTaskDocument } from "./task-document";
import {
  buildTaskPlannerSnapshot,
  buildTaskPlannerSnapshotFromRepository,
  classifyTask,
} from "./planner";

describe("planner Markdown fixtures", () => {
  it("round-trips catalog fixtures through task documents", () => {
    const documents = parsePlannerFixtures();
    expect(documents.some((document) => document.kind === "task-list")).toBe(
      true,
    );
    for (const document of documents) {
      const again = serializeTaskDocument(document);
      const parsed = documents.find((entry) => entry.path === document.path);
      expect(parsed?.id).toBe(document.id);
      expect(again).toContain(`id: ${document.id}`);
    }
    const tasks = catalogTasksFromPlannerFixtures();
    expect(tasks.find((task) => task.id === "story-task-today-1")?.areas).toEqual(
      ["Applications"],
    );
    expect(tasks.find((task) => task.id === "story-task-today-1")?.applicationId)
      .toBe("nova-bank-platform-lead");
    expect(
      tasks.find((task) => task.id === "story-task-today-2"),
    ).toMatchObject({ checklistTotal: 3, checklistCompleted: 1 });
    expect(
      tasks.find((task) => task.id === "story-task-daily-reflection")?.repeat,
    ).toMatchObject({
      start: "2026-08-19",
      rrule: "FREQ=DAILY",
      anchor: "schedule",
      missed: "carry",
    });
  });

  it("queries the same fixture set through TaskRepository summaries", async () => {
    const database = new MemoryAppDatabase("planner-fixtures");
    await database.open();
    for (const document of parsePlannerFixtures()) {
      await indexTaskDocument(database, document);
    }
    const repository = new TaskRepository(database);
    const today = "2026-08-19";
    const inbox = await repository.inbox(today);
    const plannedToday = await repository.today(today);
    const review = await repository.review(today);
    expect(inbox.map((row) => row.id)).toContain("story-task-inbox");
    expect(plannedToday.map((row) => row.id)).toContain("story-task-today-1");
    expect(review.map((row) => row.id)).toContain("story-task-review");
    const catalogToday = catalogTasksFromPlannerFixtures().filter(
      (task) => classifyTask(task, today) === "today",
    );
    expect(catalogToday.map((task) => task.id)).toEqual(
      expect.arrayContaining(["story-task-today-1", "story-task-evening"]),
    );
  });

  it("places deadline-only fixture tasks on upcoming day rows", async () => {
    const now = new Date(`${PLANNER_FIXTURE_TODAY}T12:00:00`);
    const catalogSnapshot = buildTaskPlannerSnapshot(
      catalogTasksFromPlannerFixtures(),
      now,
    );
    const upcomingTitles = (snapshot: typeof catalogSnapshot) =>
      snapshot.upcomingRows.flatMap((row) =>
        row.kind === "day" ? row.tasks.map((task) => task.title) : [],
      );

    expect(upcomingTitles(catalogSnapshot)).toEqual([
      "Draft design critique",
      "Prepare model serving examples",
      "Coordinate the launch",
      "Ship the release",
      "Verify the status page",
    ]);

    const database = new MemoryAppDatabase("planner-upcoming");
    await database.open();
    for (const document of parsePlannerFixtures()) {
      await indexTaskDocument(database, document);
    }
    const repositorySnapshot = await buildTaskPlannerSnapshotFromRepository(
      new TaskRepository(database),
      now,
    );
    expect(upcomingTitles(repositorySnapshot)).toEqual([
      "Draft design critique",
      "Prepare model serving examples",
      "Coordinate the launch",
      "Ship the release",
      "Verify the status page",
    ]);
  });

  it("keeps canceled Markdown tasks in the repository-backed Logbook", async () => {
    const now = new Date(`${PLANNER_FIXTURE_TODAY}T12:00:00`);
    const database = new MemoryAppDatabase("planner-canceled-logbook");
    await database.open();
    const files = Object.fromEntries(
      plannerMarkdownFixtures.map((fixture) => [fixture.path, fixture.raw]),
    );
    const repository = new TaskRepository(
      database,
      createMemoryTaskFileStore(files),
    );
    for (const document of parsePlannerFixtures()) {
      await indexTaskDocument(database, document);
    }

    await repository.cancel(
      "upcoming/critique.md",
      "2026-08-20T10:00:00Z",
    );
    const snapshot = await buildTaskPlannerSnapshotFromRepository(
      repository,
      now,
    );

    expect(
      snapshot.logbook.flatMap((group) =>
        group.tasks.map((task) => task.title),
      ),
    ).toContain("Draft design critique");
  });

  it("builds a sectioned list tree from the navigation document", async () => {
    const now = new Date(`${PLANNER_FIXTURE_TODAY}T12:00:00`);
    const database = new MemoryAppDatabase("planner-list-tree");
    await database.open();
    const files = Object.fromEntries(
      plannerMarkdownFixtures.map((fixture) => [fixture.path, fixture.raw]),
    );
    const store = createMemoryTaskFileStore(files);
    for (const document of parsePlannerFixtures()) {
      await indexTaskDocument(database, document);
    }
    const snapshot = await buildTaskPlannerSnapshotFromRepository(
      new TaskRepository(database, store),
      now,
    );
    expect(snapshot.listTree.sections.map((section) => section.title)).toEqual([
      "Applications",
      "Docs",
      "CV",
      "Long Flow",
    ]);
    expect(
      snapshot.listTree.sections
        .find((section) => section.title === "Docs")
        ?.lists[0]?.children.map((child) => child.title),
    ).toEqual(["Writing"]);
    expect(snapshot.areas.map((area) => area.title)).toEqual(
      expect.arrayContaining([
        "Applications",
        "Docs",
        "CV",
        "Writing",
        "Release Flow",
        "Release Train",
        "Launch Operations",
      ]),
    );
    expect(
      snapshot.listTree.sections
        .find((section) => section.title === "Long Flow")
        ?.lists[0]?.children.map((child) => child.title),
    ).toEqual(["Release Train"]);
  });
});
