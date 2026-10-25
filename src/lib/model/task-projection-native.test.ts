import { describe, expect, it } from "vitest";
import fixtures from "../../../crates/lapis-task-services/tests/fixtures/projection-inputs.json";
import { parseTaskDocument } from "./task-document";
import { projectTask } from "./task-projection";

function failure(value: unknown) {
  const error = value as Error & { parts?: string[] };
  return {
    name: error.name,
    message: error.message,
    ...(error.parts ? { parts: error.parts } : {}),
  };
}

describe("retained complete version-4 Task rows for native normalization", () => {
  it.each(fixtures)("$name", (fixture) => {
    const parsed = parseTaskDocument(fixture.raw, fixture.path);
    const snapshot = JSON.stringify(parsed);
    let result: unknown;
    try {
      result = { value: parsed ? projectTask(parsed, fixture.today) : null };
    } catch (error) {
      result = { error: failure(error) };
    }
    expect(JSON.parse(JSON.stringify(result))).toStrictEqual(fixture.expected);
    expect(JSON.stringify(parsed)).toBe(snapshot);
  });
});
