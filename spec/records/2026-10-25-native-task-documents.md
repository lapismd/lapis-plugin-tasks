# Native Task document parser intake

Last updated: 2026-10-25 19:25:24 UTC.

Status: parser-only native source acceptance is complete. Host adoption and
complete Tasks projection remain pending.

The isolated `native-task-documents` workspace starts at `569d7e30`, preserving
the default workspace's separate validation/catalog work. Canonical scope is
LN-TASK-073 and LN-TASK-074. This is parser-only source work, not complete
version-4 projection or native host selection.

The corpus contains 75 complete JSON outputs captured from unchanged
`parseTaskDocument`. It covers all three document kinds, malformed/duplicate-key
YAML, defaults, title precedence, opaque invalid metadata, recurrence
classification, comments, tracking, Markdown links/checklists, CRLF and Unicode.
The added TypeScript test compares serialized retained output directly with
that corpus; the native test compares every complete JSON record. Existing
occurrence fixtures and tests remain unchanged.

The draft native modules separate envelope parsing, record shapes, common
fields, recurrence classification, date validation, tracking and Markdown
scanning. Markdown ranges convert source bytes to contextual UTF-16 units.
The recurrence parser classifies metadata without executing recurrence.
The rrule.js notice is retained for adapted validation behavior.

## Native and retained-source evidence

Every worker used the pinned Tasks validation image
`sha256:32c745d2c3bd24816b49548c72888ce5b4a09f5cdbb6bb03eeeba06fd750bfe3`,
Rust 1.99.0, 4 CPU/12 GiB and one Cargo job with incremental compilation off.
Source came from Jujutsu, never a host source mount or host dependency tree.
All native files match their passing SHA-256 receipts byte for byte.

| Boundary | Command inside isolated worker | Result |
| --- | --- | --- |
| New native corpus | `cargo test --locked --manifest-path crates/lapis-task-services/Cargo.toml --test documents` | 1 test passes, comparing all 75 complete records. |
| Complete native suite | `cargo test --locked --manifest-path crates/lapis-task-services/Cargo.toml` | 3 tests pass, including all 27 retained occurrence fixtures and daily-date predicate. |
| Strict native lint | `cargo clippy --locked --manifest-path crates/lapis-task-services/Cargo.toml --all-targets -- -D warnings` | Passes. |
| Native format | `cargo fmt --manifest-path crates/lapis-task-services/Cargo.toml -- --check` | Passes. |
| Native build | `cargo build --locked --manifest-path crates/lapis-task-services/Cargo.toml` | Passes. |
| Unchanged TS oracle | `pnpm exec vitest run --project unit src/lib/model/task-document-native.test.ts src/lib/model/task-document.test.ts --maxWorkers=1 --no-file-parallelism` | 89 tests pass, 0 fail: 75 corpus cases and 14 retained authored cases. |
| Package check | `pnpm check` | Passes; Svelte 0 errors/0 warnings, types, App ownership and styling audits pass. |
| Complete package suite | `pnpm test --maxWorkers=1 --no-file-parallelism` | 304 tests pass, 0 fail across 39 files. |
| Public output | `pnpm build`; `pnpm publint` | Both pass. |
| Complete specification | `pnpm spec:check` | Validation, mdBook, spec-first and App ownership pass. |

Native receipts are `6e09e644` and `b7c92051`, with the final complete native
rerun `2b8a016d`, under the ignored `.local/parser-validation/` directory.
The package receipt is `8483299a`, on
clean-source snapshot `649883a523939481cc67c7f88f4c0185dca4efb0` and parent
`569d7e30ed86bd4514365e50befb908b2a8400e2`. Full source ancestry was imported
into the isolated worker, and every checked-out source file was hash verified.

The package run used 16 hash-verified public archives from the common consumer
cohort. Its temporary install projection was restored before checks; tracked
manifests and lockfile retain registry ranges. The installed graph and archive
provenance remain in the receipt. Notes packs from `e59c12b4` remain provisional
until their full source admission finishes. This source run used the isolated
workspace's retained Svelte 5.56.9; default Tasks acceptance uses 5.56.10.

## Attempts and remaining gates

Fresh SSH authentication stalled before worker creation. Owned pending probes
were stopped; one authenticated shared connection restored Docker transport.
There was no host fallback. Package snapshot preparation caught local report
files because this older workspace lacked the newer `.local/` ignore. Only
native crate files had been transferred in the earlier native runs. The local
exclude and untracking preserve reports without committing them; native files
are unchanged. The resumed handoff's count of 66 was stale; direct corpus
inspection and both test lanes verify 75 cases. A package harness attempt
passed source checksums but failed
before tests because its Git-pack stdin was not piped. The corrected cold
worker imported the exact snapshot and passed the full source lane. These were
validation-startup failures; no product expectation or assertion was changed.

No npm runtime, presentation, story or retained parser implementation changed.
The separate default Tasks SwipeItem catalog failure remains owned by Design
Core and does not become a passing browser gate through these parser tests.
The source slice's native model and unchanged TypeScript parser import none of
the affected SwipeItem presentation. Their independently passing checks qualify
this private source boundary; default Tasks presentation and common-package
admission keep their separate gates.

Host indexing, effective recurrence, version-4 row projection, link resolution,
graph validation, scheduling, materialization and mutations remain separate.
