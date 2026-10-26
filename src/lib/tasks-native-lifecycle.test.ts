import { describe, expect, it, vi } from "vitest";

vi.mock("@lapis-notes/api", () => ({
  Component: class {},
  MarkdownRenderer: class {},
  Notice: class {},
  MarkdownRenderChild: class {},
  Plugin: class {},
  PluginSettingTab: class {},
  Setting: class {},
  View: class {},
}));

import { TasksPlugin } from "./tasks-plugin";
import { migrateTasksPluginData } from "./tasks-settings";

describe("selected native Task plugin lifecycle", () => {
  it("retains production view registration while retiring renderer index writers and timers", async () => {
    const native = {
      activate: vi.fn(async () => {}),
      disable: vi.fn(async () => {}),
    };
    const repository = {
      refreshEffectiveOccurrences: vi.fn(),
      invalidateEffectiveOccurrences: vi.fn(),
    };
    const registerProjection = vi.fn();
    const schedule = vi.fn();
    const materialize = vi.fn();
    const registerView = vi.fn();
    const registerMarkdownExtension = vi.fn();
    const event = () => ({ dispatcher: { offref: vi.fn() } });
    const plugin = Object.assign(Object.create(TasksPlugin.prototype), {
      native,
      repository,
      data: migrateTasksPluginData(null),
      settingsListeners: new Set(),
      loadData: vi.fn(async () => null),
      registerEvent: vi.fn(),
      register: vi.fn(),
      registerIndexProjection: registerProjection,
      registerDomEvent: vi.fn(),
      registerView,
      registerMarkdownExtension,
      addCommand: vi.fn(),
      addRibbonIcon: vi.fn(),
      addSettingTab: vi.fn(),
      scheduleLocalDateRefresh: schedule,
      materializeTrackedToday: materialize,
      app: {
        dailyDocumentProviders: { on: vi.fn(event) },
        configuration: { on: vi.fn(event) },
        workspace: {},
      },
    }) as TasksPlugin;
    await plugin.onload();
    expect(native.activate).toHaveBeenCalledExactlyOnceWith({
      afternoonStartsAt: "12:00",
      eveningStartsAt: "17:00",
    });
    expect(registerProjection).not.toHaveBeenCalled();
    expect(repository.refreshEffectiveOccurrences).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
    expect(materialize).not.toHaveBeenCalled();
    expect(registerView).toHaveBeenCalledExactlyOnceWith(
      "tasks",
      expect.any(Function),
    );
    expect(registerMarkdownExtension).toHaveBeenCalledOnce();
    await plugin.onunload();
    expect(native.disable).toHaveBeenCalledOnce();
  });
});
