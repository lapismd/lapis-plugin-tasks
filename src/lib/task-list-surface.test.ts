import { describe, expect, it } from "vitest";
import { createTask } from "./model/fixtures";
import { taskForTasksMarkdownMutation } from "./task-list-surface";

describe("taskForTasksMarkdownMutation", () => {
  it("uses the planner task so projection-only rows cannot clear list ownership", () => {
    const projected = createTask({
      id: "task-1",
      title: "Projected title",
      sourcePath: "tasks/one.md",
    });
    const canonical = createTask({
      ...projected,
      title: "Canonical title",
      listId: "list-applications",
      areas: ["Applications"],
    });

    expect(taskForTasksMarkdownMutation(projected, [canonical])).toMatchObject({
      title: "Projected title",
      listId: "list-applications",
      areas: ["Applications"],
    });
    expect(taskForTasksMarkdownMutation(projected, [])).toBe(projected);
  });
});
