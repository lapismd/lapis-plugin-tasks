import { DEFAULT_TASKS_PLUGIN_SETTINGS } from "./tasks-settings";

export const TASKS_WORKSPACE_SETTINGS_SECTION_ID = "tasks";
export const TASKS_WORKSPACE_SETTING_IDS = {
  afternoonStartsAt: "tasks.dayParts.afternoonStartsAt",
  eveningStartsAt: "tasks.dayParts.eveningStartsAt",
  hideOverdueTasks: "tasks.dailyAgenda.hideOverdueTasks",
} as const;

export function createTasksWorkspaceSettingsSection() {
  return {
    id: TASKS_WORKSPACE_SETTINGS_SECTION_ID,
    title: "Tasks",
    description: "Daily agenda boundaries and visibility preferences.",
    icon: "list-todo" as const,
    order: 46,
    navigationGroupId: "core-plugins",
    sourcePluginId: "tasks",
    fields: [
      {
        id: TASKS_WORKSPACE_SETTING_IDS.afternoonStartsAt,
        type: "string" as const,
        presentation: "time" as const,
        title: "Afternoon starts at",
        description: "Clock times at or after this value appear in Afternoon.",
        default:
          DEFAULT_TASKS_PLUGIN_SETTINGS.dayParts.afternoonStartsAt,
        pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
      },
      {
        id: TASKS_WORKSPACE_SETTING_IDS.eveningStartsAt,
        type: "string" as const,
        presentation: "time" as const,
        title: "Evening starts at",
        description: "Clock times at or after this value appear in Evening.",
        default: DEFAULT_TASKS_PLUGIN_SETTINGS.dayParts.eveningStartsAt,
        pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
      },
      {
        id: TASKS_WORKSPACE_SETTING_IDS.hideOverdueTasks,
        type: "boolean" as const,
        title: "Hide overdue tasks",
        description:
          "Exclude carried-over tasks from Today while keeping them in Review.",
        default: DEFAULT_TASKS_PLUGIN_SETTINGS.dailyAgenda.hideOverdueTasks,
      },
    ],
  };
}
