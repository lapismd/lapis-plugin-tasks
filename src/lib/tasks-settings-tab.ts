import { Notice, PluginSettingTab, Setting, type App } from "@lapis-notes/api";
import type { TasksPlugin } from "./tasks-plugin";
import type {
  TasksNavigationColumnState,
  TasksPluginSettingsPatch,
} from "./tasks-settings";

export class TasksSettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly tasksPlugin: TasksPlugin,
  ) {
    super(app, tasksPlugin);
  }

  display(): void {
    const settings = this.tasksPlugin.getSettings();
    this.containerEl.empty();

    new Setting(this.containerEl)
      .setName("Navigation column")
      .setDesc(
        "Choose whether planner navigation is expanded, collapsed, or hidden.",
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOption("expanded", "Expanded")
          .addOption("collapsed", "Collapsed")
          .addOption("hidden", "Hidden")
          .setValue(settings.planner.navigationColumnState)
          .onChange(
            (navigationColumnState) =>
              void this.update({
                planner: {
                  navigationColumnState:
                    navigationColumnState as TasksNavigationColumnState,
                },
              }),
          ),
      );

    new Setting(this.containerEl)
      .setName("Afternoon starts")
      .setDesc("Times before this boundary appear in Morning.")
      .addText((text) =>
        text
          .setType("time")
          .setValue(settings.dayParts.afternoonStartsAt)
          .onChange(
            (afternoonStartsAt) =>
              void this.update({ dayParts: { afternoonStartsAt } }),
          ),
      );

    new Setting(this.containerEl)
      .setName("Evening starts")
      .setDesc("Times at or after this boundary appear in Evening.")
      .addText((text) =>
        text
          .setType("time")
          .setValue(settings.dayParts.eveningStartsAt)
          .onChange(
            (eveningStartsAt) =>
              void this.update({ dayParts: { eveningStartsAt } }),
          ),
      );

    new Setting(this.containerEl)
      .setName("Hide overdue tasks")
      .setDesc(
        "Hide unfinished tasks planned or due before the selected daily agenda date.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(settings.dailyAgenda.hideOverdueTasks)
          .onChange(
            (hideOverdueTasks) =>
              void this.update({ dailyAgenda: { hideOverdueTasks } }),
          ),
      );
  }

  private async update(patch: TasksPluginSettingsPatch): Promise<void> {
    try {
      await this.tasksPlugin.updateSettings(patch);
      this.display();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }
}
