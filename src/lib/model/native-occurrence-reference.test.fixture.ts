import {
  completeTaskOccurrence,
  materializeTaskOccurrence,
  scanTaskOccurrenceObservations,
  trackingCompletion,
  type TaskOccurrenceCompletion,
} from "./task-occurrence";
import { taskOccurrenceDayPart } from "./task-occurrence-repository";
import {
  capture,
  numeric,
  type MaterializationInput,
  type CompletionInput,
  type TrackingInput,
  type DayPartInput,
} from "./native-transform-reference.test.fixture";

export function captureMaterialization(input: MaterializationInput): unknown {
  return capture(() => {
    const raw = materializeTaskOccurrence(input.raw, input.path, input.input);
    const repeated = materializeTaskOccurrence(raw, input.path, input.input);
    return {
      raw,
      observations: scanTaskOccurrenceObservations(raw, input.path),
      repeated,
      repeatedObservations: scanTaskOccurrenceObservations(
        repeated,
        input.path,
      ),
    };
  });
}
export function captureCompletion(input: CompletionInput): unknown {
  return capture(() => {
    const expected = scanTaskOccurrenceObservations(
      input.expectedRaw ?? input.raw,
      input.expectedPath ?? input.path,
    )[input.expectedIndex ?? 0];
    if (!expected)
      throw new Error("Reference fixture has no expected observation");
    const completion = {
      ...input.completion,
      ...(input.completion.value !== undefined
        ? { value: numeric(input.completion.value) }
        : {}),
      ...(input.completion.durationMinutes !== undefined
        ? { durationMinutes: numeric(input.completion.durationMinutes) }
        : {}),
    } as TaskOccurrenceCompletion;
    const raw = completeTaskOccurrence(
      input.raw,
      input.path,
      { ...expected, ...input.patch },
      completion,
    );
    const observations = scanTaskOccurrenceObservations(raw, input.path);
    const current = observations.find(
      (value) =>
        value.taskId === expected.taskId &&
        value.occurrenceDate === expected.occurrenceDate,
    );
    if (!current) throw new Error("Reference completion lost its observation");
    const repeated = completeTaskOccurrence(
      raw,
      input.path,
      current,
      completion,
    );
    return {
      raw,
      observations,
      repeated,
      repeatedObservations: scanTaskOccurrenceObservations(
        repeated,
        input.path,
      ),
    };
  });
}
export function captureTracking(input: TrackingInput): unknown {
  return capture(() =>
    trackingCompletion(input.tracking, numeric(input.value)),
  );
}
export function captureDayPart(input: DayPartInput): unknown {
  return capture(() => taskOccurrenceDayPart(input.plan, input.settings));
}
