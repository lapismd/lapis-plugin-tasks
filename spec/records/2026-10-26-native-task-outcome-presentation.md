# Native Task uncertain-outcome presentation

Base: owning Tasks `df758389`. The real hosted planner case
`lost response retains one accepted native operation and recovers on reload`
failed in Notes `47823005`: the native journal accepted the operation once,
but the retained alert only displayed `Failed to fetch`. The adapter already
retained `requestId` and `uncertain` fields; those fields were absent from its
readable message, so the existing alert could not explain the safe next step.

The source repair adds request identity and inspect-before-retry guidance to an
uncertain lifecycle error's message while preserving that same error object,
code, parts and retained operation. Known failures retain their original
message. There is no new screen, automatic retry or fallback.

The strengthened exact source assertion initially fails before implementation;
its command is the existing serialized Docker `test` lane with
`src/lib/model/native-task-adapter.test.ts -t uncertain` selection. Source gates,
packed public bytes and real hosted before/after results remain recorded
separately. Publication and app signing are not part of this source repair.

Exact source baseline `55177203` is **one failure/zero selected passes** after
all 27 unchanged native cases pass. The original message contains only
`Response lost`; the new assertion requires the submitted request ID, readable
uncertainty and inspection guidance while retaining the original cause text.

The exact after-check `bacfc455` passes the selected source case and all 27
native cases. The same thrown object retains the submitted identity and original
message text, and known admission refusals retain their original message. The
complete source qualification and public pack follow before host intake.

The message-only full qualification `0d4d1e70` passed 2,864 unit cases, 27 Rust
cases and 62 cold catalog cases, strict checks, build/publint, static catalog and
specification gates. It did not qualify actionable reload recovery.

The extended source baseline `09ececa3` has **two selected failures/zero passes**
for persistence before admission and refusal before admission on failed storage.
The after-check `3fc0612b` passes 24 cases across the five affected source files,
plus all 27 native cases. The source now retains bounded client inspection references in
existing plugin data, exposes an existing public command/menu and read-only
inspection, and preserves the references across settings writes and reload.
There is no journal replica, auto-replay or new custom screen. The catalog story
`Plugins/Tasks/Native recovery/Inspect interrupted update` renders the actual
public WorkspaceShell and production inspection menu. Final source and real
hosted reload/cold recovery qualification remain separate gates.

Full run `01746d89` passes all 2,871 unit cases, 27 native cases, 63 cold
interaction/accessibility cases and strict/check/build/publint/static gates.
Its final spec-first gate found the missing governance chapter for the newly
classified catalog family. That mapped documentation is now added; the exact
specification gate and public archive pack are rerun without changing any
qualified product or story bytes.

Final exact specification run `983fb1a8` passes with the mapped governance
chapter. Product and story bytes are identical to `01746d89`; only canonical
governance and this supporting record changed. Its spec-only pack is deliberately
not a consumable artifact because it contains no built dist. A separate owning
build and public pack produces the consumer archive.

## Interactive review fixture follow-up

Exact cold baseline `d8e386d0` passes the existing one recovery story. Review of
its unexercised Forget action found a synthetic throwing fixture callback. The
story now updates its fixture-owned reference store on explicit Forget and
separately asserts zero writes during inspection. Its visible menu, native
result fixture and production implementation are unchanged. The complete owning
source/catalog gates are rerun; qualified production archive `9522bdb7` remains
the same because no runtime, package, lockfile or crate files change.

The fixture after-check `d283e24d` passes its exact cold story. Complete owning
run `4e6f6cd8` passes all 2,875 units, 27 native and 63 cold catalog cases,
strict/check/build/publint/static/specification gates. Runtime/package/crate
files remain byte-identical to `703a88e0`; consumer archive `9522bdb7` is retained.
A final supporting-receipt specification check precedes the fixture commit.
