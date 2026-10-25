# Private whole-vault native Task structure validation

Status: qualified private whole-vault graph source; complete parity and owner gates pass. No host selection.

Last updated: 2026-10-25 21:47:03 UTC.

This bounded R3 source slice starts from qualified per-document structures
`34ef8bf8`. It validates one complete already-resolved snapshot in the existing
private Tasks Rust crate. It preserves multiple-parent exclusion before cycle
detection, duplicate occurrences from one parent, strongly connected cycles and
self-links, ordered diagnostics, retained source/range/run identity and ordered
last-value document-path replacement. It never changes authored Markdown.
Target lookup, href/edge envelopes, host registration/publication, writer
selection, lifecycle, mutations and materialization remain separate.

## Frozen unchanged-TypeScript capture

Final capture `29089a47-1d6a-464a-b276-efd5f94692b2`, source `c89923e4`,
records complete resolved inputs and ordered validated Map entries for 38 vault
snapshots, 199 documents and 217 structural occurrences. SHA-256:
`ed871a6c9b06a5a4f37acd0c51805e207e38a751ba7d083dd26e6fb35ebac134`.
Normal native and retained-reference tests consume the frozen file without
regenerating expectations. All qualified earlier corpora remain unchanged.

The corpus includes all Task/List source-target combinations, duplicate
occurrences across runs, two/three conflicting parents, self/two/three/disjoint
cycles, 64-node cyclic and acyclic graphs, an apparent cycle broken by
multiple-parent exclusion, valid outgoing tails, partial/empty run filtering,
pre-existing missing/unsupported diagnostics, duplicate source IDs, duplicate
paths and same-range entry keys, and Unicode/CRLF source ranges. Duplicate-path
replacement preserves the first insertion position and last value, matching the
retained Map boundary exactly. Run entry positions are never renumbered.

An earlier authoring capture `65be494e-f5ee-4cd7-a524-619eb35e0131` completed
before correcting one input case to use distinct target IDs sharing a target
path. It was not admitted as the frozen oracle. The final capture above covers
the corrected input; no qualified expectation or committed evidence is replaced.

## Exact native before and after

`pnpm test:native -- --test graph` initially fails in
`695dfaeb-1b30-4ac1-9784-8e972a095c48`, source `a86e7f76`, with one missing-import compiler diagnostic
for the absent graph entry point; zero tests execute. The unchanged target then
passes both integration tests in `ef84a4d3-7c9f-4f87-93df-5b4ee72e56e7`, source `fef58705`:
complete captured-input graph validation and native raw-document resolution
through graph validation. All 38 complete outputs match, and caller snapshots
remain unchanged. No product/reference mismatch is suppressed.

Pinned Docker formatting worker `92efc4ab-1a20-4654-9ac8-8bdfa20b442f` formats
the Rust source; only its verified graph-source formatting difference is copied
back. Cargo manifests/lockfiles and every captured fixture remain unchanged.
Implementation is grouped under `structure/graph`, with separate component
analysis, and all production files remain under 300 lines.

## Owner gates and downstream boundaries

Focused retained-reference acceptance
`pnpm test -- src/lib/model/task-graph-native.test.ts src/lib/model/task-structure.test.ts`
passes 49 TypeScript cases and all 11 native tests in
`0dfdfb7c-2345-4dc8-9574-5934f7d78d01`, source `0b9a80fc`.

Complete `pnpm validation:all` passes on that same source in
`241e2ac2-a47e-4a5c-bc91-7bccc42904af`: routing/composition, nine validators and
102 requirements, App ownership, zero Svelte errors/warnings, types, strict
Clippy/formatting, all 645 unit cases across 48 files and all 11 native tests,
locked native build, fresh package build/publint and independent publint,
static Storybook, all 62 cold interaction/accessibility cases in three sequential
batches (14 + 8 + 40), and specification/mdbook/spec-first acceptance. The fatal
Svelte diagnostic guard stays enabled. Zero-case batch selections are unchanged;
no scenario, assertion, warning policy or visual baseline is altered.

All 52 protected prior corpus/evidence/Cargo/runtime files are verified
byte-for-byte against `34ef8bf8`. The frozen graph hash is unchanged. Only
canonical/evidence prose is updated after fully checked source `0b9a80fc`;
final registry-only specification acceptance passes. Qualified source does
not select the native provider in either host, qualify publication/lifecycle,
or authorize mutations.

Still required for Notes intake: snapshot target policy and href resolution;
structural/navigation edge, link, metadata and indexed/publication envelopes;
native provider registration, replacement/pruning, watches/rebuild admission,
local-date refresh and complete host/cold-rebuild acceptance. Mutating Markdown
transactions and daily observations remain outside this source boundary.

All workers in this lane are serial, four CPUs/12 GiB, on the pinned Docker image
`sha256:32c745d2c3bd24816b49548c72888ce5b4a09f5cdbb6bb03eeeba06fd750bfe3`.
No host fallback, runtime TypeScript change, public npm/HTTP/Tauri contract,
App/global ownership change, visual baseline or publication is introduced.

## Final specification acceptance

Registry-only `pnpm spec:check` passes in
`4a581807-02b7-4056-afbb-4190ec47cb95`, source `a7ff0b90`:
routing/composition, canonical validation, mdbook, spec-first and App ownership.
Only this receipt is appended afterward; every checked implementation, canonical
requirement, runtime and frozen fixture byte remains unchanged. No failures are
waived, assertions weakened or committed evidence edited.
