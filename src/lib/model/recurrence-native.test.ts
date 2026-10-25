import { describe, expect, it } from "vitest";
import dateSets from "../../../crates/lapis-task-services/tests/fixtures/recurrence-inputs.json";
import compatibility from "../../../crates/lapis-task-services/tests/fixtures/recurrence-compatibility-inputs.json";
import effective from "../../../crates/lapis-task-services/tests/fixtures/effective-inputs.json";
import {
  analyzeRecurrenceRule,
  RecurrenceEngine,
  type RecurrenceEngineOptions,
  type LocalDateString,
} from "./recurrence-engine";
import { resolveEffectiveOccurrence } from "./effective-occurrence";
import type { TaskRepeat } from "./task-document";

type DateQuery =
  | { method: "next"; after: LocalDateString; inclusive: boolean }
  | { method: "previous"; before: LocalDateString; inclusive: boolean }
  | {
      method: "between";
      start: LocalDateString;
      end: LocalDateString;
      inclusive: boolean;
    };

function failure(value: unknown) {
  const error = value as Error & { parts?: string[] };
  return {
    name: error.name,
    message: error.message,
    ...(error.parts ? { parts: error.parts } : {}),
  };
}

describe("retained complete recurrence contract for native execution", () => {
  it.each([...dateSets, ...compatibility])("date set: $name", (input) => {
    const fixture = input as typeof input & {
      analysis: unknown;
      constructorError?: unknown;
      expected?: unknown[];
    };
    expect(analyzeRecurrenceRule(fixture.options.rrule)).toStrictEqual(
      fixture.analysis,
    );
    let engine: RecurrenceEngine;
    try {
      engine = new RecurrenceEngine(fixture.options as RecurrenceEngineOptions);
    } catch (error) {
      expect(failure(error)).toStrictEqual(fixture.constructorError);
      return;
    }
    expect(fixture.constructorError).toBeUndefined();
    const results = fixture.queries.map((input) => {
      const query = input as DateQuery;
      try {
        if (query.method === "next") {
          return { value: engine.next(query.after, query.inclusive) };
        }
        if (query.method === "previous") {
          return { value: engine.previous(query.before, query.inclusive) };
        }
        return {
          value: engine.between(query.start, query.end, query.inclusive),
        };
      } catch (error) {
        return { error: failure(error) };
      }
    });
    expect(results).toStrictEqual(fixture.expected);
  });

  it.each(effective)("effective occurrence: $name", (input) => {
    const fixture = input as typeof input & {
      expected?: unknown;
      error?: unknown;
    };
    let result: unknown;
    try {
      result = {
        value: resolveEffectiveOccurrence(
          fixture.repeat as TaskRepeat,
          "planDate" in fixture
            ? (fixture.planDate as LocalDateString)
            : undefined,
          fixture.today as LocalDateString,
        ),
      };
    } catch (error) {
      result = { error: failure(error) };
    }
    expect(JSON.parse(JSON.stringify(result))).toStrictEqual(
      "error" in fixture
        ? { error: fixture.error }
        : { value: fixture.expected },
    );
  });
});
