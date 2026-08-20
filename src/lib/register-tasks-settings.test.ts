import { describe, expect, it } from "vitest";

import {
  createTasksWorkspaceSettingsSection,
  TASKS_WORKSPACE_SETTING_IDS,
  TASKS_WORKSPACE_SETTINGS_SECTION_ID,
} from "./tasks-workspace-settings";

describe("Tasks workspace settings", () => {
  it("describes the public Lapis settings page with plugin defaults", () => {
    const section = createTasksWorkspaceSettingsSection();

    expect(section).toMatchObject({
      id: TASKS_WORKSPACE_SETTINGS_SECTION_ID,
      title: "Tasks",
      navigationGroupId: "core-plugins",
      sourcePluginId: "tasks",
    });
    expect(section.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: TASKS_WORKSPACE_SETTING_IDS.afternoonStartsAt,
          presentation: "time",
          default: "12:00",
        }),
        expect.objectContaining({
          id: TASKS_WORKSPACE_SETTING_IDS.eveningStartsAt,
          presentation: "time",
          default: "17:00",
        }),
        expect.objectContaining({
          id: TASKS_WORKSPACE_SETTING_IDS.hideOverdueTasks,
          type: "boolean",
          default: false,
        }),
      ]),
    );
  });
});
