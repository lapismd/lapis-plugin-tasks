import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTaskDocument } from "./task-document";

const fixtures = JSON.parse(readFileSync(
  new URL("../../../crates/lapis-task-services/tests/fixtures/unicode-documents.json", import.meta.url),
  "utf8",
));

describe("retained YAML 1.2 metadata reader", () => {
  for (const fixture of fixtures) {
    it(fixture.name, () => {
      expect(parseTaskDocument(fixture.raw, fixture.path) ?? null).toEqual(fixture.expected);
    });
  }
});

const scalarFixtures = JSON.parse(readFileSync(
  new URL("../../../crates/lapis-task-services/tests/fixtures/yaml-scalars.json", import.meta.url),
  "utf8",
));
describe("retained core scalar and mapping semantics", () => {
  for (const fixture of scalarFixtures) {
    it(fixture.name, () => {
      expect(parseTaskDocument(fixture.raw, fixture.path) ?? null).toEqual(fixture.expected);
    });
  }
});
