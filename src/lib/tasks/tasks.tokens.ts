/**
 * Public CSS custom properties for Tasks planner surfaces.
 * Defaults live in `tasks.tokens.css`.
 */
export const tasksTokenNames = {
  background: "--ui-tasks-background",
  foreground: "--ui-tasks-foreground",
  muted: "--ui-tasks-muted",
  mutedSurface: "--ui-tasks-muted-surface",
  border: "--ui-tasks-border",
  accent: "--ui-tasks-accent",
  accentText: "--ui-tasks-accent-text",
  accentForeground: "--ui-tasks-accent-foreground",
  card: "--ui-tasks-card",
  destructive: "--ui-tasks-destructive",
  destructiveText: "--ui-tasks-destructive-text",
  dayAnytime: "--ui-tasks-day-anytime",
  dayMorning: "--ui-tasks-day-morning",
  dayAfternoon: "--ui-tasks-day-afternoon",
  dayEvening: "--ui-tasks-day-evening",
  dayDone: "--ui-tasks-day-done",
  radius: "--ui-tasks-radius",
} as const;

export type TasksToken = (typeof tasksTokenNames)[keyof typeof tasksTokenNames];
