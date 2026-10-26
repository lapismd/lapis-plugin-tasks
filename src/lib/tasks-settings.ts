import {
  nativeTaskReferences,
  type NativeTaskRequestReference,
} from "./model/native-task-recovery";

export const TASKS_PLUGIN_DATA_VERSION = 3 as const;

export const TASKS_NAVIGATION_COLUMN_STATES = [
  "expanded",
  "collapsed",
  "hidden",
] as const;

export type TasksNavigationColumnState =
  (typeof TASKS_NAVIGATION_COLUMN_STATES)[number];

export type TasksDayPartSettings = {
  afternoonStartsAt: string;
  eveningStartsAt: string;
};

export type TasksDailyAgendaSettings = {
  hideOverdueTasks: boolean;
};

export type TasksPlannerSettings = {
  navigationColumnState: TasksNavigationColumnState;
};

export type TasksPluginSettings = {
  dayParts: TasksDayPartSettings;
  dailyAgenda: TasksDailyAgendaSettings;
  planner: TasksPlannerSettings;
};

export type TasksPluginSettingsPatch = {
  dayParts?: Partial<TasksDayPartSettings>;
  dailyAgenda?: Partial<TasksDailyAgendaSettings>;
  planner?: Partial<TasksPlannerSettings>;
};

export type TasksPluginDataV1 = {
  version: 1;
  settings: {
    dayParts: TasksDayPartSettings;
  };
};

export type TasksPluginDataV2 = {
  version: 2;
  settings: {
    dayParts: TasksDayPartSettings;
    dailyAgenda: TasksDailyAgendaSettings;
  };
};

export type TasksPluginDataV3 = {
  version: typeof TASKS_PLUGIN_DATA_VERSION;
  settings: TasksPluginSettings;
  nativeTaskRequests?: NativeTaskRequestReference[];
};

export type TasksPluginData = TasksPluginDataV3;

export const DEFAULT_TASKS_PLUGIN_SETTINGS: TasksPluginSettings = Object.freeze(
  {
    dayParts: Object.freeze({
      afternoonStartsAt: "12:00",
      eveningStartsAt: "17:00",
    }),
    dailyAgenda: Object.freeze({
      hideOverdueTasks: false,
    }),
    planner: Object.freeze({
      navigationColumnState: "expanded",
    }),
  },
);

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

export function isTasksNavigationColumnState(
  value: unknown,
): value is TasksNavigationColumnState {
  return (
    typeof value === "string" &&
    TASKS_NAVIGATION_COLUMN_STATES.includes(value as TasksNavigationColumnState)
  );
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
  const planner = recordValue(stored.planner);
  const candidateDayParts = {
    afternoonStartsAt:
      isTaskClockTime(dayParts.afternoonStartsAt) &&
      dayParts.afternoonStartsAt !== "00:00"
        ? dayParts.afternoonStartsAt
        : DEFAULT_TASKS_PLUGIN_SETTINGS.dayParts.afternoonStartsAt,
    eveningStartsAt: isTaskClockTime(dayParts.eveningStartsAt)
      ? dayParts.eveningStartsAt
      : DEFAULT_TASKS_PLUGIN_SETTINGS.dayParts.eveningStartsAt,
  };
  let mergedDayParts: TasksDayPartSettings;
  try {
    mergedDayParts = validateTasksDayPartSettings(candidateDayParts);
  } catch {
    mergedDayParts = { ...DEFAULT_TASKS_PLUGIN_SETTINGS.dayParts };
  }
  return {
    dayParts: mergedDayParts,
    dailyAgenda: {
      hideOverdueTasks:
        typeof dailyAgenda.hideOverdueTasks === "boolean"
          ? dailyAgenda.hideOverdueTasks
          : DEFAULT_TASKS_PLUGIN_SETTINGS.dailyAgenda.hideOverdueTasks,
    },
    planner: {
      navigationColumnState: isTasksNavigationColumnState(
        planner.navigationColumnState,
      )
        ? planner.navigationColumnState
        : DEFAULT_TASKS_PLUGIN_SETTINGS.planner.navigationColumnState,
    },
  };
}

export function migrateTasksPluginData(value: unknown): TasksPluginData {
  const stored = recordValue(value);
  return {
    version: TASKS_PLUGIN_DATA_VERSION,
    settings: mergeTasksPluginSettings(stored.settings),
    ...(Array.isArray(stored.nativeTaskRequests)
      ? { nativeTaskRequests: nativeTaskReferences(stored.nativeTaskRequests) }
      : {}),
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
    planner: {
      navigationColumnState: validateNavigationColumnState(
        patch.planner?.navigationColumnState ??
          current.planner.navigationColumnState,
      ),
    },
  };
}

export function cloneTasksPluginSettings(
  settings: TasksPluginSettings,
): TasksPluginSettings {
  return {
    dayParts: { ...settings.dayParts },
    dailyAgenda: { ...settings.dailyAgenda },
    planner: { ...settings.planner },
  };
}

function validateNavigationColumnState(
  value: unknown,
): TasksNavigationColumnState {
  if (isTasksNavigationColumnState(value)) return value;
  throw new TasksSettingsValidationError(
    "Navigation column must be expanded, collapsed, or hidden.",
  );
}
