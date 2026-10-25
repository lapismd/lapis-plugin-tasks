# Native Task transformation qualification

Status: source complete; application adoption pending. Last updated: 2026-10-25T23:43:56Z.
Root migration task: R3.2.1.2.10. Requirements: LN-TASK-086–089.

The user approved the exact pure native export/value contract before
implementation. Neither application selects this implementation. Notes still
owns admission, guarded writes, daily file creation, scheduling and lifecycle.

## Retained source and oracle

The retained TypeScript baseline is `fcb2a8b514d68464034173e2aed886133d2a2e99`.
The separately qualified native YAML reader prerequisite is
`9131b27db49d81ca872582f37b145309b9c4cb09` (LN-TASK-090).
The bounded priority-presence prerequisite is
`2cfcdc59d79ed30e0e6625362dedae6deaa6d0e6` (LN-TASK-091).
All existing TypeScript model implementations and prior corpora remain unchanged.
Relative to the latter prerequisite, Cargo adds only pinned `ryu-js = "=1.0.2"` for
retained JavaScript numeric serialization. `src/lib.rs` has the approved
transformation module/export block and documentation update; its original
read-only exports remain intact.
The 116 original source hashes and capture provenance are retained in
`2026-10-25-task-transformations-oracle.json`.

The complete unchanged-TypeScript corpus retains 1,297 mutation cases, 165
materializations, 124 completions, 40 tracking conversions and 32 day-part
classifications. Every complete mutation snapshot, replacement Markdown,
reparse, observation, repeated-application result and error is compared.
The original 153 malformed custom negative cases remain; 153 corrected positive
variants were added before native qualification.

An additional 96-case corpus retains complete metadata serialization results.
Twelve separately captured cases cover `.nan`, `.inf` and `-.inf` in extra
metadata, priority and opaque repeat/tracking metadata. Both capture input
identities and complete outputs are frozen. The total is 1,766 native cases,
plus two explicit typed-order reference-adapter checks in TypeScript.

The original corpus is unchanged by the native request adapter. Two newly
constructed typed Repeat requests use the declared Rust value-field order.
`transformations-native-adapter.json` retains both complete original and adapted
outputs, captured from the unchanged TypeScript mutation. This adapter does not
reorder authored, normalized or opaque metadata. Native conformance selects
these two captured typed-request results explicitly and asserts the retained
original outputs still match the original corpus.

## Before and after

| Exact boundary | Before | Current |
| --- | --- | --- |
| Original TypeScript oracle test | Initial worker missed the oversized untracked fixture: one collection failure, zero cases | Tracking repaired; original 1,505 then expanded 1,768 reference cases pass |
| `cargo test --test transformations` | One expected compile failure: two missing pure exports | Public export integration test passes |
| `cargo test --lib transform::` | Four families passed; 269/1,297 mutation cases differed only in serialized property order | All seven families and 1,766 complete cases pass |
| Metadata serialization corpus | 20/96 failures: 18 presentation differences and two reader-owned NEL differences | All 96 pass against qualified LN-TASK-090 reader |
| Nonfinite metadata serialization | 3/12 failures: parser collapsed authored nonfinite priority to absent | All 12 pass against qualified LN-TASK-091 prerequisite |
| Full owner lanes | Pending | 25 native tests, 2,847 unit cases, 62 cold catalog cases; all source gates pass |

All 269 complete expected/actual first-pass outputs are retained in
`2026-10-25-task-transformations-first-native.json`. The repair preserves
metadata order, opaque nested order and lifecycle property insertion rather
than changing those expected outputs.
All 20 complete first metadata differences remain in
`2026-10-25-task-transformations-first-metadata-native.json`. The two reader
differences were fixed and qualified separately before this slice resumed.
The three complete first nonfinite differences remain in
`2026-10-25-task-transformations-first-nonfinite-native.json`; expected outputs
are unchanged. The bounded priority-presence prerequisite retains the original
typed scalar in serialization and the TypeScript null-valued unparsed snapshot.

## Notes adoption and cache invalidation

Notes currently reparses every selected Task document during reconciliation.
Its publication fast path compares the complete newly derived row before
skipping a write, so changed NEL/scalar interpretations are not hidden by equal
source bytes. The private authority/config signature is
`crates/lapis-app-core/src/database/tasks/mod.rs::NATIVE_CONFIG`, currently
`native-tasks-document-v4`. Its definition and publication checks already share
that single constant; no second cache owner is needed.

When Notes adopts the qualified reader/transformations, its intake must advance
that private signature and include a same-byte, cold-reopen regression seeded
with an old derived row. Public Task projection version 4, occurrence version 1,
the `tasks/v1` compatibility envelope and retained on-disk formats remain
unchanged. This source slice does not edit Notes or claim host adoption.

## Qualification lanes

One serialized Docker worker uses slot 3, four CPUs, 12 GiB RAM and 2 GiB shared
memory. Exact source packs, archive checksums, source-file hashes, tool versions,
commands and results are retained under ignored `.local/mutation-qualification`.
There is no host test/compiler fallback. Package manifests and registry lockfile
are restored before checking the temporary verified archive installation.

Immutable source run `25408aba-e1d4-4780-b421-c47280c685ab` passes full check,
strict Clippy/fmt, native/unit tests, locked build, publint, static Storybook,
all 62 cold interaction/accessibility catalog cases and canonical specification
lanes. There are zero remaining functional, interaction, accessibility or
governance failures. Final evidence/status edits receive a separate exact
`pnpm spec:check` rerun; its receipt is retained in the qualifying commit message.

The 116-file protected audit permits only the two separately qualified reader
prerequisites, the approved additive native export/documentation block and the
pinned `ryu-js` addition. Relative to `2cfcdc59`, all retained source/fixtures are
identical except the approved `src/lib.rs` and additive Cargo changes. The lock
adds seven lines without changing any pre-existing dependency version. All
original TypeScript model files and prior expected corpora remain byte-identical.
Both typed-order adapter cases retain their complete original expected results.
Visual approval, publication, host writes/scheduling and adoption remain separate.
