import { describe, expect, it } from "vitest";
import documents from "../../../crates/lapis-task-services/tests/fixtures/structure-document-inputs.json";
import { parseTaskDocument } from "./task-document";
import inputs from "../../../crates/lapis-task-services/tests/fixtures/structure-inputs.json";
import {
  scanTaskHeadings,
  scanTaskStructure,
  resolveTaskDocumentStructure,
  taskStructureForProjection,
  type TaskStructureTarget,
} from "./task-structure";

type Fixture = {
  raw: string;
  options: Parameters<typeof scanTaskStructure>[1];
  targets: Record<string, TaskStructureTarget>;
  resolve: boolean;
  lookupError?: { href: string; error: { name: string; message: string } };
  expected: unknown;
};

describe("retained complete per-document structures for native resolution", () => {
  it.each(inputs)("$name", async (input) => {
    const fixture = input as unknown as Fixture;
    const snapshot = JSON.stringify(fixture);
    const requests: Array<{ sourcePath: string; href: string }> = [];
    const actual: Record<string, unknown> = {
      headings: scanTaskHeadings(fixture.raw),
      scanned: scanTaskStructure(fixture.raw, fixture.options),
      requests,
    };
    if (fixture.resolve) {
      try {
        const resolved = await resolveTaskDocumentStructure(
          fixture.raw,
          fixture.options as Parameters<typeof resolveTaskDocumentStructure>[1],
          async (sourcePath, href) => {
            requests.push({ sourcePath, href });
            if (fixture.lookupError?.href === href) {
              const error = new Error(fixture.lookupError.error.message);
              error.name = fixture.lookupError.error.name;
              throw error;
            }
            return fixture.targets[href] ?? null;
          },
        );
        actual.resolved = resolved;
        actual.projected = taskStructureForProjection(resolved);
      } catch (value) {
        const error = value as Error;
        actual.error = { name: error.name, message: error.message };
      }
    }
    expect(JSON.parse(JSON.stringify(actual))).toStrictEqual(fixture.expected);
    expect(JSON.stringify(fixture)).toBe(snapshot);
  });
});

describe("complete document outputs for shared structure adapter regressions", () => {
  it.each(documents)("$name", ({ raw, path, expected }) => {
    expect(
      JSON.parse(JSON.stringify(parseTaskDocument(raw, path))),
    ).toStrictEqual(expected);
  });
});
