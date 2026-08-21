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
        start: "2026-08-21",
        rrule: "FREQ=WEEKLY;INTERVAL=2",
        anchor: "completion",
        missed: "carry",
        resetChecklist: true,
      },
      tracking: { type: "count", unit: "sessions", target: 3 },
    });
    const applicationTask = taskToApplicationTask(task);
    expect(applicationTask.repeat).toEqual(task.repeat);
    expect(applicationTask.tracking).toEqual(task.tracking);
    expect(applicationTaskToTask("tasks", applicationTask).repeat).toEqual(
      task.repeat,
    );
    expect(applicationTaskToTask("tasks", applicationTask).tracking).toEqual(
      task.tracking,
    );
  });
});
