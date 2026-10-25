# Native task occurrence source acceptance

Last updated: 2026-10-25 15:09:34 UTC.

This is the Tasks-owned source portion of the existing native indexing
migration. `crates/lapis-task-services` is a private Rust crate with no npm API
change. It derives disposable version-1 occurrence records from canonical daily
Markdown. It does not activate indexing, register or publish projections, own a
watcher, resolve recurrence, materialize notes or schedule local-date refresh.
Those host and domain gates remain open.

Canonical requirements: LN-TASK-070 and LN-TASK-071 in
`spec/src/plugins/tasks/index.md`. The spec-first configuration protects the
entire native crate and maps implementation details to
`spec/src/plugins/tasks/runtime.md`.

## Reference and native evidence

The repository was clean at parent `9645bcb3` before implementation. The
retained TypeScript implementation is unchanged.

| Boundary | Exact command | Before | After |
| --- | --- | --- | --- |
| Existing occurrence reference | `pnpm exec vitest run --project unit src/lib/model/task-occurrence.test.ts src/lib/model/task-occurrence-rebuild.test.ts` | 8 passed, 0 failed | Included in the 35-case final focused run. |
| Shared native/reference corpus | `pnpm exec vitest run --project unit src/lib/model/task-occurrence-native.test.ts src/lib/model/task-occurrence.test.ts src/lib/model/task-occurrence-rebuild.test.ts` | New native corpus absent. | 35 passed, 0 failed; 27 complete-record fixtures plus the 8 existing cases. |
| Native parser | `CARGO_BUILD_JOBS=1 CARGO_INCREMENTAL=0 cargo test --locked --offline --manifest-path crates/lapis-task-services/Cargo.toml` | New native crate absent. | 2 passed, 0 failed; all 27 shared fixtures and the optional daily-date predicate. |
| Strict native lint | `CARGO_BUILD_JOBS=1 CARGO_INCREMENTAL=0 cargo clippy --locked --offline --manifest-path crates/lapis-task-services/Cargo.toml --all-targets -- -D warnings` | New native crate absent. | Passed. |
| Locked native build | `CARGO_BUILD_JOBS=1 CARGO_INCREMENTAL=0 cargo build --locked --offline --manifest-path crates/lapis-task-services/Cargo.toml` | New native crate absent. | Passed. |
| Native formatting | `cargo fmt --manifest-path crates/lapis-task-services/Cargo.toml -- --check` | New native crate absent. | Passed. |

## Complete package acceptance

All commands ran sequentially without installs or dependency changes. The
complete unit run used one worker and disabled file parallelism.

| Command | Result |
| --- | --- |
| `pnpm spec:check` | Specification validation, mdBook and spec-first pass; App ownership 1 passed, 0 failed. |
| `NODE_OPTIONS=--max-old-space-size=4096 pnpm check` | Specification validation, App ownership and no-Tailwind audit pass; Svelte 0 errors/0 warnings; TypeScript passes. |
| `NODE_OPTIONS=--max-old-space-size=4096 pnpm test --maxWorkers=1 --no-file-parallelism` | 229 passed, 0 failed across 38 files. |
| `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` | Svelte package build and bundled publint pass. |
| `pnpm publint` | Passed. |
| `pnpm spec:build` | mdBook passed. |

The first specification run produced two `SPEC-VERIFY-UNMAPPED` diagnostics
because the new verification rows were outside the existing primary table.
After moving them, spec-first reported one missing Tasks overview chapter.
The native package overview and the existing sole requirement table now own
the new contract. All gates pass with zero diagnostics; no validator rule was
weakened.

The initial native fixture assertion reported one mismatch because Rust's JSON
value equality distinguishes integer `7` from floating-point `7.0`. The fixture
comparison now uses JavaScript's single numeric domain while preserving every
object key, array position and nonnumeric value. No expected fixture, product
assertion or retained parser behavior was changed to resolve that mismatch.

Expected records were captured once from the retained TypeScript parser and
retained as data. Normal tests only read the fixtures. The corpus covers
canonical and invalid YAML, all four tracking kinds, suffix-unit precedence,
URI decoding and malformed escapes, relative/absolute paths, duplicate
identities, malformed markers, CRLF, astral text, ECMAScript whitespace and
contextual UTF-16 source ends. Native parsing preserves scanner order and does
not silently truncate records at the host's publication limit.

## Qualification boundary

Source acceptance is complete. No presentation or story implementation changed;
no Storybook browser lane or visual baseline update is required for this private
parser and shared unit fixture corpus. The existing specification mirrors read
the canonical chapters directly. No publication or host acceptance has occurred.

## Host integration contract

Call `task_occurrence_projection_rows(raw, daily_document_path)` with complete
unmodified Markdown and a vault-relative path. Serialize the returned records
as each row's data; use `observation_id` as row ID, `observation` as kind and
scanner order as ordinal. Register the existing public `tasks/occurrence`
projection for owner `tasks`, schema version 1 and its API-owned field list.

The host owns selection, enabled/config state, source hashes, database
publication/errors/limits, deletion, detached lifetime and duplicate-writer
prevention. This source slice changes none of those responsibilities. The
parser returns all observations, including duplicate identities; host database
validation must remain explicit and fail visibly.
