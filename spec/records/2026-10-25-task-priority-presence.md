# Native Task priority presence

Status: source complete; application adoption pending. Last updated: 2026-10-25T23:37:00Z.
Requirement: LN-TASK-091. Mutation intake: R3.2.1.2.10.

The expanded mutation oracle exposed a read-only parser omission: authored
`.nan`, `.inf` and `-.inf` priority values became JSON null before field
normalization and were treated as absent. The retained TypeScript parser keeps
an unparsed priority, whose complete JSON snapshot contains null. A subsequent
unrelated metadata edit must retain the original typed YAML scalar.

Five complete snapshots were captured from unchanged `parseTaskDocument`:
the three nonfinite scalars plus absent and explicit-null controls. The exact
native `cargo test --test priority` reproduced three failures before editing.
All original expected/actual snapshots remain in
`2026-10-25-task-priority-before.json`. Frozen inputs and outputs remain in the
crate's `nonfinite-priority-inputs.json` and `nonfinite-priorities.json` fixtures.

The repair retains one private presence flag while the ordered YAML value is
still typed, then applies it during existing priority normalization. It adds no
public API, sentinel value, file operation, parser owner or host authority.
Public projection versions 4/1 and the `tasks/v1` compatibility envelope remain
unchanged. Existing source/corpora are preserved except the three explicitly
repaired private parser files. The Cargo manifest and lockfile are unchanged.

The immutable source rerun passes all five complete snapshots, all 114 inherited
document snapshots, 17 native tests, 1,079 unit cases and 62 cold catalog cases.
Strict Clippy/fmt, full check, locked build, publint and static Storybook pass.
The aggregate run's final spec-first step reported two missing mapped chapter
updates (`index.md` and `runtime.md`); both chapters now describe this repair.
The exact `pnpm spec:check` boundary is rerun after this evidence update; its
receipt is recorded in the qualifying commit message. There are no product,
interaction or accessibility failures. The aggregate run and its two original
governance findings remain retained rather than relabeled as a pass.
Docker slot 3 uses four CPUs, 12 GiB RAM, 2 GiB shared memory and one Cargo job;
there is no host qualification fallback. Exact source/archive hashes, tool
versions, commands and results are retained under ignored
`.local/mutation-qualification` and summarized in
`2026-10-25-task-priority-provenance.json`.

Notes adoption remains separate. Its existing private `NATIVE_CONFIG` signature
must advance and its intake must prove same-byte cache refresh across a cold
reopen. No Notes implementation or migration tracker is changed here.
