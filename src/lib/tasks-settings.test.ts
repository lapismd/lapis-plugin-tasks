import { describe, expect, it } from "vitest";
import {
  DEFAULT_TASKS_PLUGIN_SETTINGS,
  TASKS_PLUGIN_DATA_VERSION,
  TasksSettingsValidationError,
  migrateTasksPluginData,
  patchTasksPluginSettings,
} from "./tasks-settings";

describe("Tasks settings", () => {
  it("uses the default day-part boundaries for absent, older, and malformed data", () => {
    expect(migrateTasksPluginData(null)).toEqual({
      version: TASKS_PLUGIN_DATA_VERSION,
      settings: DEFAULT_TASKS_PLUGIN_SETTINGS,
    });
    expect(
      migrateTasksPluginData({
        version: 0,
        settings: { dayParts: { afternoonStartsAt: "10:00", eveningStartsAt: "20:00" } },
      }).settings,
    ).toEqual(DEFAULT_TASKS_PLUGIN_SETTINGS);
    expect(
      migrateTasksPluginData({
        version: TASKS_PLUGIN_DATA_VERSION,
        settings: { dayParts: { afternoonStartsAt: "17:00", eveningStartsAt: "12:00" } },
      }).settings,
    ).toEqual(DEFAULT_TASKS_PLUGIN_SETTINGS);
  });

  it("retains valid current-version boundaries", () => {
    expect(
      migrateTasksPluginData({
        version: TASKS_PLUGIN_DATA_VERSION,
        settings: { dayParts: { afternoonStartsAt: "11:30", eveningStartsAt: "18:45" } },
      }).settings,
    ).toEqual({
      dayParts: { afternoonStartsAt: "11:30", eveningStartsAt: "18:45" },
    });
  });

  it("rejects invalid and unordered settings patches without changing the input", () => {
    const current = {
      dayParts: { afternoonStartsAt: "12:00", eveningStartsAt: "17:00" },
    };
    expect(() =>
      patchTasksPluginSettings(current, { dayParts: { afternoonStartsAt: "17:00" } }),
    ).toThrow(TasksSettingsValidationError);
    expect(() =>
      patchTasksPluginSettings(current, { dayParts: { eveningStartsAt: "24:00" } }),
    ).toThrow("valid time");
    expect(current.dayParts).toEqual({
      afternoonStartsAt: "12:00",
      eveningStartsAt: "17:00",
    });
  });
});
