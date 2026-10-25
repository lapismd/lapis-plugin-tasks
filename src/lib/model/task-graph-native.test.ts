import { describe, expect, it } from "vitest";
import inputs from "../../../crates/lapis-task-services/tests/fixtures/graph-inputs.json";
import {
  resolveTaskDocumentStructure,
  validateTaskStructureGraph,
  type ResolvedTaskDocumentStructure,
  type TaskStructureTarget,
} from "./task-structure";

type Fixture = {
  documents: Array<{
    raw: string;
    options: Parameters<typeof resolveTaskDocumentStructure>[1];
    targets: Record<string, TaskStructureTarget>;
  }>;
  resolved: ResolvedTaskDocumentStructure[];
  expected: unknown;
};

describe("retained complete whole-vault graphs for native validation", () => {
  it.each(inputs)("$name", async (input) => {
    const fixture = input as unknown as Fixture;
    const snapshot = JSON.stringify(fixture);
    const resolved = await Promise.all(
      fixture.documents.map(({ raw, options, targets }) =>
        resolveTaskDocumentStructure(
          raw,
          options,
          (_source, href) => targets[href] ?? null,
        ),
      ),
    );
    expect(resolved).toStrictEqual(fixture.resolved);
    expect([...validateTaskStructureGraph(resolved)]).toStrictEqual(
      fixture.expected,
    );
    expect([...validateTaskStructureGraph(fixture.resolved)]).toStrictEqual(
      fixture.expected,
    );
    expect(JSON.stringify(fixture)).toBe(snapshot);
  });
});
