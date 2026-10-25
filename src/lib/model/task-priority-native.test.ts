import { describe, expect, it } from "vitest";
import fixtures from "../../../crates/lapis-task-services/tests/fixtures/nonfinite-priorities.json";
import { parseTaskDocument } from "./task-document";

describe("retained nonfinite priority presence", () => {
  it.each(fixtures)("$name", ({ raw, path, expected }) => {
    expect(JSON.parse(JSON.stringify(parseTaskDocument(raw, path)))).toStrictEqual(expected);
  });
});
