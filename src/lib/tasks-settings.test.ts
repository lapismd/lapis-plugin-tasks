import { describe, expect, it } from "vitest";
import {
  cloneTasksPluginSettings,
  DEFAULT_TASKS_PLUGIN_SETTINGS,
  TASKS_PLUGIN_DATA_VERSION,
  TasksSettingsValidationError,
  migrateTasksPluginData,
  patchTasksPluginSettings,
} from "./tasks-settings";

describe("Tasks settings", () => {
  it("uses defaults and migrates version 1 without losing valid settings", () => {
    expect(migrateTasksPluginData(null)).toEqual({
      version: TASKS_PLUGIN_DATA_VERSION,
      settings: DEFAULT_TASKS_PLUGIN_SETTINGS,
    });
    expect(
      migrateTasksPluginData({
        version: 1,
        settings: {
          dayParts: { afternoonStartsAt: "10:00", eveningStartsAt: "20:00" },
        },
      }).settings,
    ).toEqual({
      dayParts: { afternoonStartsAt: "10:00", eveningStartsAt: "20:00" },
      dailyAgenda: { hideOverdueTasks: false },
      planner: { navigationColumnState: "expanded" },
    });
  });

  it("migrates version 2, invalid versions, and partial version 3 data", () => {
    expect(
      migrateTasksPluginData({
        version: 2,
        settings: {
          dayParts: { afternoonStartsAt: "11:00", eveningStartsAt: "18:00" },
          dailyAgenda: { hideOverdueTasks: true },
        },
      }).settings,
    ).toEqual({
      dayParts: { afternoonStartsAt: "11:00", eveningStartsAt: "18:00" },
      dailyAgenda: { hideOverdueTasks: true },
      planner: { navigationColumnState: "expanded" },
    });

    expect(
      migrateTasksPluginData({
        version: 999,
        settings: {
          dayParts: { afternoonStartsAt: "17:00", eveningStartsAt: "12:00" },
          dailyAgenda: { hideOverdueTasks: true },
          planner: { navigationColumnState: "collapsed" },
        },
      }).settings,
    ).toEqual({
      dayParts: { afternoonStartsAt: "12:00", eveningStartsAt: "17:00" },
      dailyAgenda: { hideOverdueTasks: true },
      planner: { navigationColumnState: "collapsed" },
    });

    expect(
      migrateTasksPluginData({
        version: TASKS_PLUGIN_DATA_VERSION,
        settings: { planner: { navigationColumnState: "invalid" } },
      }).settings,
    ).toEqual(DEFAULT_TASKS_PLUGIN_SETTINGS);
  });

  it("retains valid current-version boundaries", () => {
    expect(
      migrateTasksPluginData({
        version: TASKS_PLUGIN_DATA_VERSION,
        settings: {
          dayParts: { afternoonStartsAt: "11:30", eveningStartsAt: "18:45" },
        },
      }).settings,
    ).toEqual({
      dayParts: { afternoonStartsAt: "11:30", eveningStartsAt: "18:45" },
      dailyAgenda: { hideOverdueTasks: false },
      planner: { navigationColumnState: "expanded" },
    });
  });

  it("rejects invalid and unordered settings patches without changing the input", () => {
    const current = {
      dayParts: { afternoonStartsAt: "12:00", eveningStartsAt: "17:00" },
      dailyAgenda: { hideOverdueTasks: false },
      planner: { navigationColumnState: "expanded" as const },
    };
    expect(() =>
      patchTasksPluginSettings(current, {
        dayParts: { afternoonStartsAt: "17:00" },
      }),
    ).toThrow(TasksSettingsValidationError);
    expect(() =>
      patchTasksPluginSettings(current, {
        dayParts: { eveningStartsAt: "24:00" },
      }),
    ).toThrow("valid time");
    expect(current.dayParts).toEqual({
      afternoonStartsAt: "12:00",
      eveningStartsAt: "17:00",
    });
  });

  it("retains and patches the persisted overdue preference", () => {
    expect(
      migrateTasksPluginData({
        version: TASKS_PLUGIN_DATA_VERSION,
        settings: {
          dayParts: { afternoonStartsAt: "12:00", eveningStartsAt: "17:00" },
          dailyAgenda: { hideOverdueTasks: true },
        },
      }).settings.dailyAgenda,
    ).toEqual({ hideOverdueTasks: true });

    expect(
      patchTasksPluginSettings(DEFAULT_TASKS_PLUGIN_SETTINGS, {
        dailyAgenda: { hideOverdueTasks: true },
      }).dailyAgenda,
    ).toEqual({ hideOverdueTasks: true });
  });

  it("validates, clones, and patches the navigation column state", () => {
    const current = patchTasksPluginSettings(DEFAULT_TASKS_PLUGIN_SETTINGS, {
      planner: { navigationColumnState: "collapsed" },
    });
    const cloned = cloneTasksPluginSettings(current);
    cloned.planner.navigationColumnState = "hidden";
    expect(current.planner.navigationColumnState).toBe("collapsed");
    expect(cloned.planner.navigationColumnState).toBe("hidden");
    expect(cloned.planner).not.toBe(current.planner);
    expect(DEFAULT_TASKS_PLUGIN_SETTINGS.planner.navigationColumnState).toBe(
      "expanded",
    );
    expect(() =>
      patchTasksPluginSettings(DEFAULT_TASKS_PLUGIN_SETTINGS, {
        planner: { navigationColumnState: "broken" as "hidden" },
      }),
    ).toThrow("expanded, collapsed, or hidden");
  });
});
