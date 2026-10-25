# Private per-document native Task structures

Status: qualified private per-document source; complete parity and required
owner gates pass. No whole-vault graph or host selection.

Last updated: 2026-10-25 21:33:31 UTC.

This bounded R3 source slice starts from qualified row normalization `030cb061`.
It covers headings, candidate/checklist scanning, supplied target lookup,
diagnostics, contiguous TaskRuns and the projection-shaped per-document structure.
All implementation remains Tasks-owned in its existing private Rust crate.
No App/metadata-cache implementation, filesystem access, whole-vault graph,
mutation, materialization, public npm/HTTP/Tauri API or host writer changes.

The corpus reuses all 75 qualified document inputs without modifying them,
plus 21 focused Markdown/lookup cases. Navigation uses heading/scan acceptance
only, matching the retained resolver's Task/Task List input contract.

## Frozen unchanged-TypeScript capture

Capture `a7cc5363-4d43-4e81-b23a-c4a232317ffd`, source `adef8e05`,
records all 96 complete headings/scans, lookup request sequences, resolved
structures/projection shapes and the callback-error outcome from unchanged
TypeScript. SHA-256: `1fa7eb3870be29bee67d179bddedb0211e2dbc2e8489dc568333bf86083e72d0`.
Normal tests consume this frozen file without regenerating expectations.

## Exact native before

Canonical `pnpm test:native -- --test structure` run
`1a50cafb-b4cd-4df8-b11e-9922059a59e3`, source `ceeab14b`, fails with one
compiler diagnostic for the six absent structure imports; zero tests execute.
The receipt is retained unchanged. No product/reference failure is suppressed.

## Retained CRLF range repair

First implemented native run `5b257ad8-41f5-4f47-8bda-98ef19d80d2d`, source
`f1e14c61`, reaches `unicode-crlf-ranges` and reports one complete-output failure.
CommonMark retains an extra trailing blank CRLF line on the checklist item;
Lezer excludes that blank line but keeps the content line's carriage return.
The shared native range adapter now drops trailing blank lines while preserving
all content-line whitespace and UTF-16 positions. The document parser uses that
same adapter, so its complete prior corpus must pass again. No fixture or
reference expectation changes.

Second exact run `e8420508-5e5c-40cd-b14f-787eee0c4c88`, source `e38a17fd`,
passes the repaired CRLF case and reaches one `tabs-and-indent` range failure.
CommonMark includes a preceding newline/tab in those Item/List starts; Lezer
starts at the bullet. The shared native adapter now normalizes only Markdown
indent/newline prefixes for those range starts. Previous parser acceptance is
retained as a required gate; no captured output is changed.

## Exact repaired native acceptance

The unchanged full target passes all 96 structure scenarios in
`480643c9-61ad-4e55-9eff-060cd7b4841c`, source `6ae06ef1`: complete headings,
scanned records, resolved/projection objects, ordered lookup requests and callback
error propagation. Both range defects are repaired, 2 -> 0, without changing
captured expectations. The initial missing-import compilation remains separate.

Three separate complete document regressions are also captured from unchanged
TypeScript for the shared adapter's CRLF, tab and empty-heading cases. Original
qualified document and structure corpora remain frozen; no result is regenerated.

Separate document capture `552ae04b-0696-4550-9a7d-0be6acf400e8`, source
`2858389b`, records complete unchanged-TypeScript parser output for all three
adapter cases. SHA-256: `0ae9bbe5fabd971e3e1b05338d70ad70fc6f45d2f9fc7fc8c9f9c3661819383b`.
It does not replace or extend the existing frozen document/structure files.
A prior authoring preparation `af78d02b-9cee-4cb8-88d1-c1a742973a26` stops before
Docker creation because source changes during packing. The snapshot guard
rejects the inconsistent input; the clean unchanged-source retry above passes.
No tests execute in the failed preparation and the guard is not weakened.

Pinned Docker formatting worker `fccaa796-e5d9-4c13-a462-3cc4db857d99`
runs rustfmt and copies only verified formatting differences back. Cargo files
and all fixture bytes remain unchanged. No host compiler or fallback is used.

## Focused and complete owner source gates

Exact canonical target after the three additional adapter regressions passes both
native integration tests in `02e8f23e-0b22-40c2-ade7-d3fbb9879156`, source
`9f2fec16`: all 96 per-document structures and three complete parser outcomes.
The original 96-case fixture hash remains unchanged.

The focused command
`pnpm test -- src/lib/model/task-structure-native.test.ts src/lib/model/task-structure.test.ts`
passes 110 retained TypeScript cases and all nine native tests in
`69a577fa-7c1a-4543-bf4b-204bc1d808f6`, source `9f2fec16`.
Full `pnpm check` passes in `19160e5f-a5bb-47f2-a99e-dca9fe48c110` on the same
source: routing/composition, nine validators/100 requirements, App ownership,
Svelte with zero errors/warnings, types, strict Clippy and formatting.

Full `pnpm test` passes 607 unit cases across 47 files and all nine native tests
in `93de2fe6-5d6c-4e5f-875e-493753960b67`, also source `9f2fec16`. This retains
the complete original parser, occurrence, recurrence and version-4 row corpora.
All six prior fixture files, committed evidence, Cargo manifest/lock and runtime
model implementations are verified byte-for-byte against `030cb061`.

The structure corpus contains 96 heading/scanning outcomes (27 headings,
70 candidates and ten checklist items), 93 complete resolved/projection pairs,
two scan-only navigation cases and one propagated callback error. Callback
request order and early termination are compared in full, alongside every
serialized record. No reference algorithm is modified or copied into a host.

## Build, package and downstream boundaries

Canonical `pnpm build` passes locked native compilation and fresh Svelte
packaging/publint in `47ec51a6-0c60-4ba1-a5fd-a334e331303c`, source `9f2fec16`.
Standalone `pnpm publint` independently rebuilds and passes in
`35cdc967-a5da-43e9-a1f0-c01e67241a12`, on the same source. All package lanes use
the verified 16-archive source cohort, while tracked dependency manifests and
locks retain registry resolution. Exact native acceptance is registry-frozen.

Implementation is grouped under `structure/records`, `scanner`, `resolution`
and `source`, sharing the existing native Markdown adapter instead of introducing
a second parser. All production Rust files in this slice remain below 300 lines after pinned
formatting. Empty headings follow the retained sequential closing-marker
normalization; the separate document regression captures that complete result.

| Still pending           | Boundary                                                                                                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whole-vault graph       | `validateTaskStructureGraph`: multiple-parent conflicts, strongly connected cycles/self-links and retained duplicate occurrences over one complete snapshot. Per-document target classification does not admit those edges. |
| Target policy/envelopes | Host target lookup and `resolveTaskHref`; snapshot resolver adoption; navigation/structural edges, links, tags/metadata, source hashes and indexed/publication row envelopes.                                               |
| Publication/lifecycle   | Native registration, replacement/pruning, watches/rebuild admission, local-date refresh and either host's writer selection with native/cold-rebuild acceptance.                                                             |
| Mutating behavior       | Markdown transactions, completion/skip/pause and daily observations remain separate. This source slice never writes files, publishes rows or materializes observations.                                                     |

No runtime TypeScript, App/global ownership boundary, UI, public npm/HTTP/Tauri
contract or other source repository changes. No host selection, whole-vault
qualification, visual approval, publication or cross-platform release is claimed.

## Fresh catalog and acceptance identity

`pnpm test:storybook` passes all 62 cases in three cold sequential batches
(14 + 8 + 40), run `2aed4b69-d808-47bb-a394-4c03fcc5bf0c`, source `9f2fec16`.
All interaction/accessibility checks and the fatal Svelte diagnostic guard pass.
Zero-case files retain the declared batch selection; no scenario, assertion,
warning policy or visual baseline is changed. Visual approval remains separate.

All heavy workers are serialized in this lane with four CPUs/12 GiB, using the
pinned Docker image
`sha256:32c745d2c3bd24816b49548c72888ce5b4a09f5cdbb6bb03eeeba06fd750bfe3`.
Its actual pnpm/Cargo caches and source/archive hashes remain in the reports.
No host fallback, source/dependency mount, native app restart or source-owner
workaround is introduced. Final package/native failures are zero; the compiler,
range and preparation attempts above remain recorded separately.

## Final specification acceptance

Registry-only `pnpm spec:check` passes all routing/composition, specification,
mdbook, spec-first and App ownership lanes in
`1efbd00a-70e2-433a-8c46-5c717c05e517`, source `121e5105`.
Canonical LN-TASK-080–081 record qualified private source only. After fully
checked source `9f2fec16`, only canonical/evidence prose changes. Both new frozen
hashes and all prior corpus/evidence/runtime bytes are rechecked unchanged.
No failure is waived, no assertion is weakened and no committed evidence is edited.
