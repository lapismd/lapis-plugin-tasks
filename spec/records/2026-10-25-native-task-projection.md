# Private native version-4 Task row normalization

Status: qualified private source; complete parity and required source gates
pass. No host selection.

Last updated: 2026-10-25 21:12:53 UTC.

This bounded R3 source slice follows qualified recurrence `c725d58b`, using its
clean isolated workspace. It implements only the read-only `projectTask` value
boundary in the existing `publish=false` native Tasks crate. Public npm, HTTP
and Tauri contracts, runtime TypeScript, host writers and existing corpora stay
unchanged. Whole-vault structures, database publication and date scheduling
retain separate gates. See LN-TASK-078–079.

The new corpus covers all 75 qualified document inputs, all 18 qualified
effective-occurrence inputs embedded in authored Task documents, and 13
additional row-specific cases. Every input supplies explicit local today.
Complete serialized outputs, including null/omitted fields and errors, are
captured from unchanged TypeScript before native implementation.

## Frozen unchanged-TypeScript oracle

Capture worker `0061382d-2e9f-413a-88dc-0fcd7c7655cb`, source `405623fa`,
uses the pinned Docker image, one four-CPU/12-GiB worker and the verified
16-archive source cohort. It compares source/archive hashes and captures
complete outputs from unchanged `parseTaskDocument` and `projectTask`.
No reference implementation or prior fixture is modified. Normal tests consume
the frozen output and never regenerate it.

Projection corpus SHA-256: `63d4fd0ced616b1e69f78f6870dc9a999a15ce58d382837bf9710a8c272d9742`.

## Exact native before

Canonical `pnpm test:native -- --test projection` run
`cbe85f94-bb62-4de5-a849-549191c3a6fb`, source `9ae918c2`, fails with one
compiler diagnostic for the two absent exports `project_task` and
`TASK_PROJECTION_VERSION`. No test executes. The receipt is retained unchanged.
The reference capture has 92 Task rows, five Task Lists, one navigation row,
seven absent documents and one retained `Invalid local date: 2026-99-99` error.

## Exact native after and implementation boundary

The exact unchanged native target passes its complete 106-outcome test in
`dd7f75f0-8ce3-4c98-8f5a-b308e6387cd7`, source `da0ffba8`, with no warnings.
`projection/records.rs` owns the typed serializable value; `projection/mod.rs`
owns the pure conversion. Task-only fields flatten only on Task rows, preserving
omitted fields for Lists/navigation and null fields for Tasks. Opaque repeat and
priority values stay JSON data. The existing effective resolver supplies all
recurrence states and propagates the retained invalid-date error.

The output has no structural rows/edges, database adapter or source hashes.
No clock, filesystem, mutation, scheduler or writer selection is introduced.
The only existing engine change is crate-private visibility on its shared error
constructor. Pinned formatting worker
`b69fd817-fe59-4178-9819-1ff8e0b36cd0` runs rustfmt in Docker and copies only
verified formatting differences back. Cargo dependencies/lock are unchanged.

## Focused and source checks

Canonical focused command
`pnpm test -- src/lib/model/task-projection-native.test.ts src/lib/model/task-projection.test.ts`
passes all 108 retained-reference cases and all seven native integration tests
in `2391ba3b-a58a-4d51-9af9-34b016a3a0fe`, source `763568b8`. The TypeScript
comparison also checks that projection leaves its parsed input unchanged.
Native JSON comparisons use the existing document-test convention of normalizing
numeric values to the JavaScript Number domain; no field, result or error is
omitted from comparison.

Full `pnpm check` passes in `6bf72b55-7148-4b0d-bd25-288c6a5601b9`, source
`763568b8`: routing/composition, nine validators/98 requirements, App ownership,
Svelte with zero errors/warnings, types, strict Clippy and rustfmt.
The sole before-state compiler failure is repaired, 1 -> 0. No implemented
native behavior, reference, functional or check failure has occurred.

All five previous fixture files are verified byte-for-byte against `c725d58b`,
as are the Cargo manifest/lock, retained `projectTask`/effective TypeScript and
committed recurrence evidence. They are not regenerated or reformatted.

## Complete tests and remaining projection work

Full `pnpm test` passes 508 unit cases across 46 files and all seven native
integration tests in `b4c49d79-2d7d-4ec7-acee-38c0b4299b4e`, source `763568b8`.
This retains the qualified 75 documents, 27 occurrences, date predicate,
34 recurrence sets/18 effective outcomes and the new 106 projection outcomes.
The unchanged npm/presentation/runtime JS means the separate 62-case catalog
receipt from `3b6cada3` is retained, without repeating unaffected UI suites.
Visual approval, publication and host-native acceptance remain separate.

The following are still pending; this summary normalizer does not close them:

| Boundary                   | Retained TypeScript work still needing native source/adoption                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structure/targets          | `scanTaskHeadings`, `resolveTaskDocumentStructure`, `taskStructureForProjection` and `validateTaskStructureGraph`: target lookup, heading paths, contiguous TaskRuns, hashes, parent conflicts and cycles over a complete vault snapshot. |
| Projection envelopes       | `resolveTaskHref`, `taskEdges`, indexed links and `taskDocumentToIndexedFile`: structural/navigation edges, source ranges, tags/metadata and publication rows around the normalized summary.                                              |
| Host publication/lifecycle | Projection registration, source hashes, guarded replacement/pruning, watcher/rebuild admission, local-date refresh and either host's writer/default selection.                                                                            |
| Mutating behavior          | Markdown serializers/transactions, recurrence completion/skip/pause and daily observations remain separate from this read-only source slice.                                                                                              |

The normalizer does not claim database rebuild, structural parity, plugin-host
replacement, cross-platform acceptance, publication or release. The default
Tasks workspace remains unchanged while this isolated source work is qualified.

## Build and package gates

Canonical `pnpm build` passes locked native compilation, fresh Svelte packaging
and publint in `792296d4-0f1e-4efd-9ad5-3f54f62489bf`, source `763568b8`.
Standalone `pnpm publint` independently rebuilds and passes in
`da2c7cb3-4c8d-4585-8703-41ad0f0c2d1b`, source `a8313561`; intervening changes
are evidence prose only. Those package commands use the verified 16-archive
source cohort; tracked dependency manifests and locks retain registry resolution.

Every heavy worker is serialized within this lane and bounded to four CPUs and
12 GiB in the pinned Docker image
`sha256:32c745d2c3bd24816b49548c72888ce5b4a09f5cdbb6bb03eeeba06fd750bfe3`.
No host fallback, dependency/source mount, UI baseline update, host package
installation or app restart occurs. Native exact acceptance is separately registry-frozen.

## Final specification acceptance

Registry-only `pnpm spec:check` passes routing/composition, validation, mdbook,
spec-first and App ownership in `95ab0efe-95e8-47ef-ba48-1cf1997f237e`, source
`514327c2`. Canonical LN-TASK-078–079 record this private source completion.
Only canonical/evidence prose changes after the full checked source `763568b8`;
implementation, tests and corpus stay unchanged. Final frozen projection hash
still matches the capture above. No failure is waived or assertion weakened.
