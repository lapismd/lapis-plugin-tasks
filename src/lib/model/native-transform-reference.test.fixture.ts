import type {
  TaskPlan,
  TaskRepeat,
  TaskStart,
  TaskTracking,
} from "./task-document";
import type {
  TaskOccurrenceMaterialization,
  TaskOccurrenceObservation,
} from "./task-occurrence";

type Numeric = number | { special: "NaN" | "Infinity" | "-Infinity" };
export type Action = {
  type: string;
  at?: string;
  localDate?: string;
  position?: Numeric;
  expectedText?: string;
  checked?: boolean;
  plan?: TaskPlan;
  start?: TaskStart;
  deadline?: string;
  inbox?: boolean;
  repeat?: TaskRepeat;
  tracking?: TaskTracking;
};
export type MutationInput = {
  name: string;
  raw: string;
  path: string;
  actions: Action[];
};
export type MaterializationInput = {
  name: string;
  raw: string;
  path: string;
  input: TaskOccurrenceMaterialization;
};
export type CompletionInput = {
  name: string;
  raw: string;
  path: string;
  expectedRaw?: string;
  expectedPath?: string;
  expectedIndex?: number;
  patch?: Partial<TaskOccurrenceObservation>;
  completion: {
    type: string;
    value?: Numeric;
    unit?: string;
    durationMinutes?: Numeric;
  };
};
export type TrackingInput = {
  name: string;
  tracking?: TaskTracking;
  value?: Numeric;
};
export type DayPartInput = {
  name: string;
  plan?: TaskPlan;
  settings: { afternoonStartsAt: string; eveningStartsAt: string };
};

export function numeric(value: Numeric | undefined): number | undefined {
  if (typeof value !== "object") return value;
  return value.special === "NaN"
    ? Number.NaN
    : value.special === "Infinity"
      ? Number.POSITIVE_INFINITY
      : Number.NEGATIVE_INFINITY;
}
function retainedError(value: unknown) {
  const error = value as Error & { code?: string; parts?: string[] };
  return {
    error: {
      name: error.name,
      message: error.message,
      ...(error.code !== undefined ? { code: error.code } : {}),
      ...(error.parts !== undefined ? { parts: error.parts } : {}),
    },
  };
}
export function capture(run: () => unknown): unknown {
  try {
    return JSON.parse(JSON.stringify({ value: run() }));
  } catch (error) {
    return retainedError(error);
  }
}
