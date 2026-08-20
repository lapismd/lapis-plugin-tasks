import { describe, expect, it } from "vitest";
import { applicationTaskToTask, taskToApplicationTask } from "./application-adapter";
import { createTask } from "./fixtures";

describe("application task checklist aggregates", () => {
  it("preserves projection counts through both catalog adapters", () => {
    const task = createTask({
      id: "task-checklist",
      title: "Review interview notes",
      checklistTotal: 3,
      checklistCompleted: 1,
    });

    const applicationTask = taskToApplicationTask(task);
    expect(applicationTask).toMatchObject({
      checklistTotal: 3,
      checklistCompleted: 1,
    });
    expect(applicationTaskToTask("atlas-ai-infra", applicationTask)).toMatchObject(
      {
        checklistTotal: 3,
        checklistCompleted: 1,
      },
    );
  });

  it("preserves recurrence through both catalog adapters", () => {
    const task = createTask({
      id: "task-repeat",
      title: "Weekly review",
      repeat: {
        strategy: "rolling",
        frequency: "weekly",
        interval: 2,
        anchor: "completion",
        resetChecklist: true,
      },
    });
    const applicationTask = taskToApplicationTask(task);
    expect(applicationTask.repeat).toEqual(task.repeat);
    expect(applicationTaskToTask("tasks", applicationTask).repeat).toEqual(
      task.repeat,
    );
  });
});
