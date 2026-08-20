export const TASKS_PLUGIN_DATA_VERSION = 2 as const;

export type TasksDayPartSettings = {
  afternoonStartsAt: string;
  eveningStartsAt: string;
};

export type TasksDailyAgendaSettings = {
  hideOverdueTasks: boolean;
};

export type TasksPluginSettings = {
  dayParts: TasksDayPartSettings;
  dailyAgenda: TasksDailyAgendaSettings;
};

export type TasksPluginSettingsPatch = {
  dayParts?: Partial<TasksDayPartSettings>;
  dailyAgenda?: Partial<TasksDailyAgendaSettings>;
};

export type TasksPluginDataV1 = {
  version: 1;
  settings: {
    dayParts: TasksDayPartSettings;
  };
};

export type TasksPluginDataV2 = {
  version: typeof TASKS_PLUGIN_DATA_VERSION;
  settings: TasksPluginSettings;
};

export type TasksPluginData = TasksPluginDataV2;

export const DEFAULT_TASKS_PLUGIN_SETTINGS: TasksPluginSettings = Object.freeze({
  dayParts: Object.freeze({
    afternoonStartsAt: "12:00",
    eveningStartsAt: "17:00",
  }),
  dailyAgenda: Object.freeze({
    hideOverdueTasks: false,
  }),
});

export class TasksSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TasksSettingsValidationError";
  }
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function isTaskClockTime(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  return hours! >= 0 && hours! <= 23 && minutes! >= 0 && minutes! <= 59;
}

export function validateTasksDayPartSettings(
  settings: TasksDayPartSettings,
): TasksDayPartSettings {
  if (!isTaskClockTime(settings.afternoonStartsAt)) {
    throw new TasksSettingsValidationError(
      "Afternoon start must be a valid time in HH:mm format.",
    );
  }
  if (!isTaskClockTime(settings.eveningStartsAt)) {
    throw new TasksSettingsValidationError(
      "Evening start must be a valid time in HH:mm format.",
    );
  }
  if (settings.afternoonStartsAt === "00:00") {
    throw new TasksSettingsValidationError(
      "Afternoon must start after 00:00 so the morning bucket is not empty.",
    );
  }
  if (settings.afternoonStartsAt >= settings.eveningStartsAt) {
    throw new TasksSettingsValidationError(
      "Evening must start after afternoon.",
    );
  }
  return {
    afternoonStartsAt: settings.afternoonStartsAt,
    eveningStartsAt: settings.eveningStartsAt,
  };
}

export function mergeTasksPluginSettings(value: unknown): TasksPluginSettings {
  const stored = recordValue(value);
  const dayParts = recordValue(stored.dayParts);
  const dailyAgenda = recordValue(stored.dailyAgenda);
  try {
    return {
      dayParts: validateTasksDayPartSettings({
        afternoonStartsAt:
          typeof dayParts.afternoonStartsAt === "string"
            ? dayParts.afternoonStartsAt
            : DEFAULT_TASKS_PLUGIN_SETTINGS.dayParts.afternoonStartsAt,
        eveningStartsAt:
          typeof dayParts.eveningStartsAt === "string"
            ? dayParts.eveningStartsAt
            : DEFAULT_TASKS_PLUGIN_SETTINGS.dayParts.eveningStartsAt,
      }),
      dailyAgenda: {
        hideOverdueTasks:
          typeof dailyAgenda.hideOverdueTasks === "boolean"
            ? dailyAgenda.hideOverdueTasks
            : DEFAULT_TASKS_PLUGIN_SETTINGS.dailyAgenda.hideOverdueTasks,
      },
    };
  } catch {
    return cloneTasksPluginSettings(DEFAULT_TASKS_PLUGIN_SETTINGS);
  }
}

export function migrateTasksPluginData(value: unknown): TasksPluginData {
  const stored = recordValue(value);
  const settings =
    stored.version === TASKS_PLUGIN_DATA_VERSION || stored.version === 1
      ? stored.settings
      : null;
  return {
    version: TASKS_PLUGIN_DATA_VERSION,
    settings: mergeTasksPluginSettings(settings),
  };
}

export function patchTasksPluginSettings(
  current: TasksPluginSettings,
  patch: TasksPluginSettingsPatch,
): TasksPluginSettings {
  return {
    dayParts: validateTasksDayPartSettings({
      ...current.dayParts,
      ...patch.dayParts,
    }),
    dailyAgenda: {
      ...current.dailyAgenda,
      ...patch.dailyAgenda,
    },
  };
}

export function cloneTasksPluginSettings(
  settings: TasksPluginSettings,
): TasksPluginSettings {
  return {
    dayParts: { ...settings.dayParts },
    dailyAgenda: { ...settings.dailyAgenda },
  };
}
