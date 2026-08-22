import { Notice, type Plugin } from "@lapis-notes/api";
import { getWorkspaceHostBinding } from "@lapis-notes/api/workspace-host";

import type { TasksPlugin } from "./tasks-plugin";
import type { TasksPluginSettings } from "./tasks-settings";
import {
  createTasksWorkspaceSettingsSection,
  TASKS_WORKSPACE_SETTING_IDS,
} from "./tasks-workspace-settings";

const TASKS_WORKSPACE_SETTING_ID_SET = new Set<string>(
  Object.values(TASKS_WORKSPACE_SETTING_IDS),
);

export function registerTasksWorkspaceSettings(
  plugin: TasksPlugin & Plugin,
): void {
  let binding: ReturnType<typeof getWorkspaceHostBinding>;
  try {
    binding = getWorkspaceHostBinding(plugin.app.workspace);
  } catch {
    return;
  }

  const controller = binding.controller.settings;
  plugin.register(
    binding.controller.registerSettingsSection({
      ...createTasksWorkspaceSettingsSection(),
      sourcePluginId: plugin.id,
    }),
  );

  let syncing = false;
  const syncController = (settings: TasksPluginSettings) => {
    syncing = true;
    controller.update(
      TASKS_WORKSPACE_SETTING_IDS.afternoonStartsAt,
      settings.dayParts.afternoonStartsAt,
    );
    controller.update(
      TASKS_WORKSPACE_SETTING_IDS.eveningStartsAt,
      settings.dayParts.eveningStartsAt,
    );
    controller.update(
      TASKS_WORKSPACE_SETTING_IDS.hideOverdueTasks,
      settings.dailyAgenda.hideOverdueTasks,
    );
    controller.update(
      TASKS_WORKSPACE_SETTING_IDS.navigationColumnState,
      settings.planner.navigationColumnState,
    );
    syncing = false;
  };

  syncController(plugin.getSettings());

  const changeRef = controller.on("change", (event) => {
    if (
      syncing ||
      typeof event.id !== "string" ||
      !TASKS_WORKSPACE_SETTING_ID_SET.has(event.id)
    ) {
      return;
    }
    const values = controller.getSnapshot().values;
    void plugin
      .updateSettings({
        dayParts: {
          afternoonStartsAt: String(
            values[TASKS_WORKSPACE_SETTING_IDS.afternoonStartsAt] ?? "",
          ),
          eveningStartsAt: String(
            values[TASKS_WORKSPACE_SETTING_IDS.eveningStartsAt] ?? "",
          ),
        },
        dailyAgenda: {
          hideOverdueTasks:
            values[TASKS_WORKSPACE_SETTING_IDS.hideOverdueTasks] === true,
        },
        planner: {
          navigationColumnState: String(
            values[TASKS_WORKSPACE_SETTING_IDS.navigationColumnState] ?? "",
          ) as TasksPluginSettings["planner"]["navigationColumnState"],
        },
      })
      .catch((error) => {
        syncController(plugin.getSettings());
        new Notice(
          error instanceof Error
            ? error.message
            : "Unable to update Tasks settings.",
        );
      });
  });
  plugin.register(() => controller.offref(changeRef));
  plugin.register(plugin.subscribeSettings(syncController));
}
