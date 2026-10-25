import { describe, expect, it } from "vitest";
import { isTaskSourcePath } from "./task-source-path";

describe("planner source event admission", () => {
  it.each([
    ["default private state", ".lapis/tasks.md", ".lapis", false],
    ["custom private state", "private/state/tasks.md", "private/state", false],
    ["explicit legacy state", ".obsidian/tasks.md", ".obsidian", false],
    ["ordinary note", "notes/Tasks.md", ".lapis", true],
    ["neighbor prefix", ".lapis-notes/Tasks.md", ".lapis", true],
    ["inactive state directory", ".obsidian/Tasks.md", ".lapis", true],
    ["non-Markdown event", "notes/image.png", ".lapis", false],
  ] as const)("respects %s", (_label, path, configDir, admitted) => {
    expect(isTaskSourcePath(path, configDir)).toBe(admitted);
  });
});
