import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import { describe, expect, it } from "vitest";
import { catalogTasksFromPlannerFixtures, parsePlannerFixtures } from "./planner-fixtures";
import { indexTaskDocument } from "./task-index";
import { TaskRepository } from "./task-repository";
import { serializeTaskDocument } from "./task-document";
import { classifyTask } from "./planner";

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
});
