import { describe, expect, it } from "vitest";
import rawInputs from "../../../crates/lapis-task-services/tests/fixtures/index-inputs.json";
import { parseTaskDocument, type ParsedTaskFile } from "./task-document";
import {
  createTaskStructureResolverFromDocuments,
  indexResolvedTaskDocument,
  resolveTaskHref,
  taskDocumentToIndexedFile,
  taskEdges,
} from "./task-index";
import type { ResolvedTaskDocumentStructure } from "./task-structure";
import type { AppDatabase } from "@lapis-notes/api/app-database";

type Href = { sourcePath: string; href: string };
type Inputs = {
  hrefs: Array<Href & { expected: string }>;
  snapshots: Array<{
    name: string;
    documents: Array<{ raw: string; path: string }>;
    queries: Href[];
    expected: unknown;
  }>;
  envelopes: Array<{
    name: string;
    raw: string;
    path: string;
    today: string;
    structure: ResolvedTaskDocumentStructure | null;
    expected: unknown;
  }>;
};
const inputs = rawInputs as unknown as Inputs;

describe("retained href normalization for native indexing", () => {
  it.each(inputs.hrefs)(
    "$sourcePath → $href",
    ({ sourcePath, href, expected }) => {
      expect(resolveTaskHref(sourcePath, href)).toBe(expected);
    },
  );
});

describe("retained snapshot target policy for native indexing", () => {
  it.each(inputs.snapshots)("$name", async (input) => {
    const snapshot = JSON.stringify(input);
    const documents = input.documents
      .map(({ raw, path }) => parseTaskDocument(raw, path))
      .filter((document): document is ParsedTaskFile => document !== null);
    const resolve = createTaskStructureResolverFromDocuments(documents);
    expect(
      await Promise.all(
        input.queries.map(({ sourcePath, href }) => resolve(sourcePath, href)),
      ),
    ).toStrictEqual(input.expected);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe("retained complete native index envelopes", () => {
  it.each(inputs.envelopes)("$name", async (input) => {
    const snapshot = JSON.stringify(input);
    let actual: unknown;
    try {
      const document = parseTaskDocument(input.raw, input.path);
      if (!document) actual = { value: null };
      else {
        const calls: Record<string, unknown> = {};
        const database = {
          upsertIndexedFile: async (value: unknown) => {
            calls.indexedFile = value;
          },
          replaceProjectionSource: async (value: unknown) => {
            calls.projectionSource = value;
          },
        } as unknown as AppDatabase;
        const indexedFile = taskDocumentToIndexedFile(
          document,
          input.structure,
          input.today,
        );
        await indexResolvedTaskDocument(
          database,
          document,
          input.structure,
          input.today,
        );
        expect(calls.indexedFile).toStrictEqual(indexedFile);
        actual = {
          value: {
            edges: taskEdges(document, input.structure),
            indexedFile,
            projectionSource: calls.projectionSource,
          },
        };
      }
    } catch (value) {
      const error = value as Error;
      actual = { error: { name: error.name, message: error.message } };
    }
    expect(JSON.parse(JSON.stringify(actual))).toStrictEqual(input.expected);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
