# Retained Task lifecycle coordination source

Status: source qualified; Notes application coordination remains separate.
Last updated: 2026-10-26T00:45:00Z.
Requirements: LN-TASK-092/093. Application intake: R3.2.1.2.10.3.

Source base: `fde58de0b03f97691a109b3448f414c5ac19eb5a`. Existing document,
recurrence, transformation and metadata fixtures remain byte-preserved.

The source reference calls the actual `TaskRepository.complete/skip` and
`TaskOccurrenceRepository` against explicit fake stores. Transparent spies
forward unchanged arguments and retain the source-derived pure Task replacement,
materialization input and completion intent. It records complete returned values,
named errors, attempted persistence, retained Markdown, fresh Task parses and
complete daily observations for each attempt.

The authored matrix has 95 cases covering complete/skip, recurring and ordinary
Tasks, completion-origin establishment, paused/unsupported/exhausted recurrence,
all tracking types, missing/invalid quantities, day-part boundaries, custom daily
paths, canonical-date and duplicate failures, explicit provider seed creation,
failed daily/Task writes with retries, and next-day skip after completion.

Capture is authoring, not a native pass. The frozen reference precedes the exact
missing-planner native baseline and implementation. Source planners return only
values; Notes owns providers, both writes, recovery and its existing scheduler.

Portable qualification uses shared serialized slot 3 with four CPUs,
12 GiB memory and 2 GiB shared memory. No host compiler/test fallback is used.

## Frozen source and native baseline

Source capture `e8d2ed5b-54db-4676-aa27-996fd4d18af0` passed its transparent-
spy and known-good assertions, then exported 95 cases / 98 complete attempts.
The collected `test-results/lifecycle.json` was copied byte-for-byte to
`crates/lapis-task-services/tests/fixtures/lifecycle.json`.

Exact baseline `pnpm test:native -- --test lifecycle` failed with one E0432
compiler diagnostic naming the absent `TaskLifecycleAction` and
`plan_task_lifecycle` exports. Receipt:
`e57ba51f-63cf-4efb-b120-3ac537d9e8a0`. The fixture was present; no setup
failure was counted as a product failure. Native implementation followed.

## Exact planner result

`pnpm test:native -- --test lifecycle` passes all 95 complete scenarios /
98 attempts in `d3f39b15-8279-4a07-8f1c-926e3dbfe58e` (one native test,
zero failures). The first implementation run `3321e3e0-aec8-4185-89a8-83024d4ce922`
compared serde's integer and floating Number representations directly and
stopped at equal JavaScript numeric values `8` / `8.0`. An authoring-script
failure left that comparison unchanged for one repeated run. The final test
uses the same numeric canonicalization as existing document/transformation
corpora on both operands, preserving every field, array and exact Markdown
string. No frozen expected bytes were edited. After that established boundary
was applied, all 98 full planner results matched with no product differences.

The planner returns the exact replacement plus an optional observation input/
completion. It composes qualified source functions and keeps the prior public
Task projection and occurrence versions, existing DTO serialization, runtime
TypeScript, native algorithms and fixture bytes unchanged. Its own observation
serialization omits absent tracking as the retained repository does.

The first full gate `39567ff4-74b4-4be2-8864-1caa25b7b155` stopped at two
`SPEC-VERIFY-UNMAPPED` diagnostics: new verification rows had been appended after
the table's following prose rather than inside the table. Both authored rows
are moved into the existing table before the exact specification validation
rerun. This governance authoring correction changes no product or expected data.
Exact retained reference replay `cc13ddb5-93e6-4549-bcb7-e8dea1b9f3cf` passed
the full 95-case artifact unchanged before that broad gate.

The first exact spec rerun `71277b71-fcb0-43a8-8f0f-2c0e1a9c5686` retained
the same two findings because a blank line still separated the inserted rows
from the table. The blank separator is removed, keeping both rows contiguous
with LN-TASK-091 before the next exact rerun.

## Full source qualification

Exact `pnpm spec:validate` then passes all nine validators, 14 chapters and
112 requirements in `d20d0666-5201-44c0-98a3-c94126d376b7`.

`pnpm validation:all` passes in
`0d44b4fa-6353-4ce1-b445-f5fcc44d0855`, finished
2026-10-26T00:43:19Z. Qualified product snapshot:
`f1b467423497777dcdc73f19a56acbf3f5f61830`, parent `fde58de0`.
The run qualifies strict native formatting/Clippy, Svelte/TypeScript, App
ownership, 26 native tests, 2,848 unit cases, build, publint, static Storybook,
all 62 cold catalog interaction/accessibility cases and full specification
validation/build/spec-first. Existing story families without plays retain
their recorded skips. There are zero functional or accessibility failures.

A byte comparison with the source base checks all 259 existing TypeScript
source files, native fixture files and Cargo manifests/lock: zero differences.
Only new test fixtures/reference code and the new pure native planner/exports
extend those surfaces. Public projection/occurrence versions are unchanged.

The new LN-TASK-092/093 status/evidence closure passes final `pnpm spec:check`
in `a166a37e-2ade-409b-88b0-d56689bdba78`. This source commit does not advance
Notes application acceptance,
native daily-provider selection, two-file recovery, tracked-today scheduling,
Desktop/host defaults, visual approval, publication or deployment.
