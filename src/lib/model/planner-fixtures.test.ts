import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import { describe, expect, it } from "vitest";
import {
  catalogTasksFromPlannerFixtures,
  plannerHistoryMarkdownFixtures,
  parsePlannerFixtures,
  plannerMarkdownFixtures,
  PLANNER_FIXTURE_TODAY,
} from "./planner-fixtures";
import {
  PUBLIC_TASK_OCCURRENCES_PROJECTION_ID,
  TASK_OCCURRENCE_PROJECTION_FIELDS,
  TASK_OCCURRENCE_PROJECTION_VERSION,
} from "@lapis-notes/api/app-database";
import { indexTaskDocument } from "./task-index";
import { taskOccurrenceProjectionRows } from "./task-occurrence";
import { createMemoryTaskFileStore, TaskRepository } from "./task-repository";
import { serializeTaskDocument } from "./task-document";
import {
  buildTaskPlannerSnapshot,
  buildTaskPlannerDaySnapshot,
  buildTaskPlannerSnapshotFromRepository,
  classifyTask,
} from "./planner";

describe("planner Markdown fixtures", () => {
  it("includes recurring rows in the catalog agenda at the fixture date", () => {
    const agenda = buildTaskPlannerDaySnapshot(
      catalogTasksFromPlannerFixtures(),
      PLANNER_FIXTURE_TODAY,
    );
    expect(agenda.morning.map((task) => task.id)).toEqual([
      "story-task-daily-reflection",
      "story-task-morning",
    ]);
    expect(agenda.afternoon.map((task) => task.id)).toEqual([
      "story-task-afternoon-boundary",
    ]);
    expect([
      ...agenda.anytime,
      ...agenda.morning,
      ...agenda.afternoon,
      ...agenda.evening,
    ]).toHaveLength(8);
  });

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
      start: "2026-08-18",
      rrule: "FREQ=DAILY",
      anchor: "schedule",
      missed: "carry",
    });
    expect(
      tasks.find((task) => task.id === "story-task-daily-reflection")?.tracking,
    ).toEqual({
      type: "count",
      unit: "reflections",
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

  it("keeps the app-backed navigation totals stable after occurrence refresh", async () => {
    const now = new Date(`${PLANNER_FIXTURE_TODAY}T12:00:00`);
    const database = new MemoryAppDatabase("planner-view-counts");
    await database.open();
    const files = Object.fromEntries(
      plannerMarkdownFixtures.map((fixture) => [fixture.path, fixture.raw]),
    );
    const repository = new TaskRepository(
      database,
      createMemoryTaskFileStore(files),
      () => now,
    );
    for (const document of parsePlannerFixtures()) {
      await indexTaskDocument(database, document);
    }
    const snapshot = await buildTaskPlannerSnapshotFromRepository(repository, now);
    expect({
      inbox: snapshot.inbox.length,
      review: snapshot.review.length,
      upcoming: snapshot.upcoming.reduce((total, group) => total + group.tasks.length, 0),
      anytime: snapshot.anytime.length,
      someday: snapshot.someday.length,
      logbook: snapshot.logbook.reduce((total, group) => total + group.tasks.length, 0),
    }).toEqual({ inbox: 1, review: 1, upcoming: 5, anytime: 2, someday: 1, logbook: 3 });
  });

  it("seeds historical selected-date rows for the real workspace story", async () => {
    const database = new MemoryAppDatabase("planner-history-fixture");
    await database.open();
    for (const document of parsePlannerFixtures()) {
      await indexTaskDocument(database, document, undefined, PLANNER_FIXTURE_TODAY);
    }
    await database.registerProjectionDefinition({
      projectionId: PUBLIC_TASK_OCCURRENCES_PROJECTION_ID,
      ownerPluginId: "tasks",
      schemaVersion: TASK_OCCURRENCE_PROJECTION_VERSION,
      configHash: "occurrence-v1",
      visibility: "public",
      fields: TASK_OCCURRENCE_PROJECTION_FIELDS,
      active: true,
      updatedAt: 1,
    });
    for (const fixture of plannerHistoryMarkdownFixtures) {
      const rows = taskOccurrenceProjectionRows(fixture.raw, fixture.path);
      await database.replaceProjectionSource({
        projectionId: PUBLIC_TASK_OCCURRENCES_PROJECTION_ID,
        sourcePath: fixture.path,
        sourceHash: fixture.raw,
        rows: rows.map((row, ordinal) => ({
          id: row.observationId,
          kind: "observation",
          ordinal,
          data: row as unknown as Record<string, unknown>,
        })),
        writerPluginId: "tasks",
      });
    }
    const history = await new TaskRepository(database).occurrenceHistory(
      "2026-08-18",
      "2026-08-18",
      PLANNER_FIXTURE_TODAY,
    );
    expect(
      history.map(({ title, outcome, value, unit }) => ({
        title,
        outcome,
        value,
        unit,
      })),
    ).toEqual([
      {
        title: "Daily stand-up reflection",
        outcome: "completed",
        value: 3,
        unit: "reflections",
      },
      {
        title: "Prepare the morning brief",
        outcome: "missed",
        value: undefined,
        unit: undefined,
      },
      {
        title: "Review the midday handoff",
        outcome: "unrecorded",
        value: undefined,
        unit: undefined,
      },
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
      snapshot.areas.find((area) => area.id === "list-docs"),
    ).toMatchObject({
      title: "Docs",
      path: "lists/docs.md",
    });
    expect(
      snapshot.areas.find((area) => area.id === "list-writing"),
    ).toMatchObject({
      title: "Writing",
      path: "lists/writing.md",
      breadcrumb: ["Docs", "Writing"],
    });
    expect(
      snapshot.listTree.sections
        .find((section) => section.title === "Long Flow")
        ?.lists[0]?.children.map((child) => child.title),
    ).toEqual(["Release Train"]);
  });
});
