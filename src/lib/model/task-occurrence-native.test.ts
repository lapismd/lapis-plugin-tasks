import { describe, expect, it } from "vitest";
import fixtures from "../../../crates/lapis-task-services/tests/fixtures/occurrences.json";
import { isCanonicalDailyDocument, taskOccurrenceProjectionRows } from "./task-occurrence";

describe("retained occurrence contract for native indexing", () => {
  it.each(fixtures)("$name", ({ raw, path, canonical, expected }) => {
    expect(isCanonicalDailyDocument(raw)).toBe(canonical);
    expect(taskOccurrenceProjectionRows(raw, path)).toEqual(expected);
  });
});
