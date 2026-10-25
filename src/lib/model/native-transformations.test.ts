import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  captureMutation,
  captureMaterialization,
  captureCompletion,
  captureTracking,
  captureDayPart,
  captureNativeMutation,
} from "./native-mutation-reference.test.fixture";

const corpus = JSON.parse(
  readFileSync(
    new URL(
      "../../../crates/lapis-task-services/tests/fixtures/transformations.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
corpus.yamlMutations = JSON.parse(
  readFileSync(
    new URL(
      "../../../crates/lapis-task-services/tests/fixtures/transformations-yaml.json",
      import.meta.url,
    ),
    "utf8",
  ),
).mutations;
corpus.nonfiniteMutations = JSON.parse(
  readFileSync(
    new URL(
      "../../../crates/lapis-task-services/tests/fixtures/transformations-nonfinite.json",
      import.meta.url,
    ),
    "utf8",
  ),
).mutations;

for (const [family, capture] of Object.entries({
  mutations: captureMutation,
  materializations: captureMaterialization,
  completions: captureCompletion,
  tracking: captureTracking,
  dayParts: captureDayPart,
  yamlMutations: captureMutation,
  nonfiniteMutations: captureMutation,
})) {
  describe(`retained native transformation oracle: ${family}`, () => {
    for (const input of corpus[family]) {
      it(input.name, () => {
        const before = JSON.stringify(input);
        expect(capture(input)).toEqual(input.expected);
        expect(JSON.stringify(input)).toBe(before);
      });
    }
  });
}

const adapter = JSON.parse(
  readFileSync(
    new URL(
      "../../../crates/lapis-task-services/tests/fixtures/transformations-native-adapter.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
describe("native typed replacement field order", () => {
  for (const input of adapter) {
    it(input.name, () => {
      expect(captureMutation(input)).toEqual(input.retainedExpected);
      expect(captureNativeMutation(input)).toEqual(input.expected);
    });
  }
});
