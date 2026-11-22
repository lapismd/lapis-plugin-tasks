import { describe, expect, it } from "vitest";
import { savedTask, sidebarTask } from "./task-data";

describe("Tasks MCP detail", () => {
  it.each([
    [{ kind: "anytime" }, "anytime"],
    [{ kind: "someday" }, "someday"],
    [{ kind: "date", date: "2026-08-21" }, "2026-08-21"],
  ])("uses the native start record %j", (start, expected) => {
    const saved = savedTask.parse({
      snapshot: { path: "Tasks/Example.md", version: "saved-version" },
      task: {
        id: "example",
        path: "Tasks/Example.md",
        kind: "task",
        title: "Example",
        tags: [],
        body: "",
        task: {
          status: "open",
          start,
          plan: { date: "2026-08-22", at: "time", time: "09:00" },
        },
      },
    });
    expect(sidebarTask(saved)).toMatchObject({
      start: expected,
      planDate: "2026-08-22",
      planAt: "09:00",
    });
  });
});
