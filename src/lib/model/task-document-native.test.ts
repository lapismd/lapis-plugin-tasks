import { describe, expect, it } from "vitest";
import fixtures from "../../../crates/lapis-task-services/tests/fixtures/documents.json";
import { parseTaskDocument } from "./task-document";

describe("retained document contract for native parsing", () => {
  it.each(fixtures)("$name", ({ raw, path, expected }) => {
    const serialized = JSON.parse(JSON.stringify(parseTaskDocument(raw, path)));
    expect(serialized).toStrictEqual(expected);
  });
});
