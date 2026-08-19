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
  accentForeground: "--ui-tasks-accent-foreground",
  card: "--ui-tasks-card",
  destructive: "--ui-tasks-destructive",
  radius: "--ui-tasks-radius",
} as const;

export type TasksToken = (typeof tasksTokenNames)[keyof typeof tasksTokenNames];

