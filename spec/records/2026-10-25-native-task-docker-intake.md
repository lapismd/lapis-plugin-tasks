# Native Tasks parser and Docker tooling intake

Status: source identity and specification intake qualified; no new runtime
acceptance or host selection is claimed.

This isolated `native-recurrence-20261025` merge retains committed parser source
`f06b79b4` and Docker/tooling source `3b6cada3` as separate parents. Neither
qualified commit is rewritten. The default Tasks workspace remains unchanged
and clean on `3b6cada3`; the earlier recurrence draft remains preserved in
`native-task-documents` until this intake is verified.

The only manual merge resolutions combine canonical requirement and verification
table additions: tooling/source-path LN-TASK-072 plus parser LN-TASK-073/074.
Every native parser, existing fixture and retained document-oracle test must
remain byte-identical to `f06b79b4`. Every other production/package/tooling input
must remain byte-identical to `3b6cada3`.

The working workspace now uses the committed fail-closed Docker defaults and
its pinned image, source-pack ancestry, separate caches and archive projection.
The actual worker's install explicitly selects `/cache/pnpm`; native cache
variables select `/cache/cargo` and `/cache/target`. No host source or dependency
mount is added. The original parser evidence remains immutable and scoped to
its exact earlier source/cohort. This merge intake makes no new parser, host or
complete product claim. Recurrence oracle/baseline and its subsequent full source
qualification remain the next independently verifiable slice.

## Qualification

All 22 existing native parser/fixture and retained-oracle test inputs are
byte-identical to committed `f06b79b4`; the ignored equality receipt is
`.local/parser-intake-equality.json`. The other implementation, package, lock
and tooling bytes match committed `3b6cada3`. Only the two specification tables
need manual merge resolution. All earlier evidence stays byte-identical.

Canonical `pnpm spec:check` passes from fresh Docker snapshot `9492451c` with
both committed parents. Run `3728937e-732c-4a8c-803b-92b405bc0870` performs a
frozen registry install, 23 routing lanes, 23 story-family checks, canonical
validation, mdBook, spec-first and one App-ownership test, with zero failures.
This is the registry/spec intake, separate from the earlier explicit archive
cohort product acceptance. Native parser and tooling suites retain their
original qualified receipts; they are not repeated merely for this merge.
The recurrence slice will qualify changed native and retained-reference inputs
through the now-integrated Docker defaults.
