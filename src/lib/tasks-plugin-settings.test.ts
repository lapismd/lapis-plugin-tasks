import { describe, expect, it, vi } from "vitest";

vi.mock("@lapis-notes/api", () => ({
  Notice: class Notice {},
  Plugin: class Plugin {},
  PluginSettingTab: class PluginSettingTab {},
  Setting: class Setting {},
  View: class View {},
}));

import { TasksPlugin } from "./tasks-plugin";
import {
  migrateTasksPluginData,
  type TasksPluginDataV1,
  type TasksPluginSettings,
} from "./tasks-settings";

type TasksPluginSettingsHarness = {
  data: TasksPluginDataV1;
  saveQueue: Promise<void>;
  settingsListeners: Set<(settings: TasksPluginSettings) => void>;
  saveData(data: TasksPluginDataV1): Promise<void>;
  getSettings: TasksPlugin["getSettings"];
  updateSettings: TasksPlugin["updateSettings"];
  subscribeSettings: TasksPlugin["subscribeSettings"];
};

function settingsHarness(saveData: TasksPluginSettingsHarness["saveData"]) {
  return Object.assign(Object.create(TasksPlugin.prototype), {
    data: migrateTasksPluginData(null),
    saveQueue: Promise.resolve(),
    settingsListeners: new Set<(settings: TasksPluginSettings) => void>(),
    saveData,
  }) as TasksPluginSettingsHarness;
}

describe("TasksPlugin settings persistence", () => {
  it("serializes saves and notifies subscribers with each persisted snapshot", async () => {
    let releaseFirstSave: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      releaseFirstSave = resolve;
    });
    const saved: TasksPluginDataV1[] = [];
    const saveData = vi.fn(async (data: TasksPluginDataV1) => {
      saved.push(data);
      if (saved.length === 1) await firstSave;
    });
    const plugin = settingsHarness(saveData);
    const notifications: TasksPluginSettings[] = [];
    plugin.subscribeSettings((settings) => notifications.push(settings));

    const first = plugin.updateSettings({
      dayParts: { afternoonStartsAt: "11:30" },
    });
    const second = plugin.updateSettings({
      dayParts: { eveningStartsAt: "18:30" },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(saveData).toHaveBeenCalledTimes(1);

    releaseFirstSave?.();
    await Promise.all([first, second]);

    expect(saved.map((data) => data.settings.dayParts)).toEqual([
      { afternoonStartsAt: "11:30", eveningStartsAt: "17:00" },
      { afternoonStartsAt: "11:30", eveningStartsAt: "18:30" },
    ]);
    expect(notifications.map((settings) => settings.dayParts)).toEqual([
      { afternoonStartsAt: "11:30", eveningStartsAt: "17:00" },
      { afternoonStartsAt: "11:30", eveningStartsAt: "18:30" },
    ]);
  });

  it("continues the persistence queue after a failed save", async () => {
    const saveData = vi
      .fn<(data: TasksPluginDataV1) => Promise<void>>()
      .mockRejectedValueOnce(new Error("disk full"))
      .mockResolvedValue(undefined);
    const plugin = settingsHarness(saveData);

    await expect(
      plugin.updateSettings({ dayParts: { afternoonStartsAt: "11:00" } }),
    ).rejects.toThrow("disk full");
    await expect(
      plugin.updateSettings({ dayParts: { eveningStartsAt: "18:00" } }),
    ).resolves.toBeUndefined();
    expect(saveData).toHaveBeenCalledTimes(2);
  });
});
