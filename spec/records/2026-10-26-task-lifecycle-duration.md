# Valid duration Task lifecycle source reference

Status: source-qualified; native application admission and recovery remain separate.
Last updated: 2026-10-26T02:02:39Z.
Base: `a2e9f126afd54ab3e9f4418c5c41769bbf9876b0`.

The original 95-case trace authored duration Task YAML with `targetMinutes`.
The existing parser normalizes that shape to no tracking; its captured outcomes
remain correct and byte-preserved but do not qualify a valid tracked duration
workflow. This extension supplies a separate 18-case matrix using the unchanged
source-owned `target: 30m` representation. It does not alter runtime TypeScript,
any existing fixture, the planner, parser, formatter or published/native DTOs.

The existing source capture invokes actual Task/occurrence repositories and
records complete returned/parsed values, planner output, attempted/persisted
Markdown, daily observations and write order. The new corpus retains complete/
skip, all recurrence availability/anchor states and missing/invalid values.
Known-good assertions require a duration observation, eight-minute completion
and daily-before-Task order for supported recurring completions.

`pnpm capture:native-lifecycle-reference` authors the new artifact in the isolated
worker. Only the new duration artifact will be frozen; the original collected
95-case artifact must equal the prior fixture. Frozen TypeScript replay and
native planner comparison follow before the complete owner gates. Native
application admission, partial outcomes, cold recovery and both hosts remain
separate in Notes R3.2.1.2.10.3.

## Exact source and native results

Capture `636ea3d7-7e7f-4406-a3f9-91f032728e8a` passes both source tests,
retaining the original 95 cases/98 attempts plus 18 separate valid-duration
attempts. Known-good assertions verify complete duration observation intent,
values and daily-before-Task persistence for supported recurring completion.
The newly collected artifact is frozen byte-for-byte with SHA-256
`55d5cb2a054de33dad58fecfb6cb0d22f1994867159521e2e106cf050734ad1d`.
The captured original corpus remains byte-identical to its existing fixture,
SHA-256 `0d9de47410ffaba45a495c2df1b484c13b2a736a7f64c7263a1b4f8354732551`.

The first exact `pnpm test:native -- --test lifecycle_duration` passes the full
18 planner outcomes in `a58e589d-612a-4478-8780-bcfc49e633ef`: one test,
zero failures. This is a qualification gap rather than a native defect; no
runtime implementation change is needed. Comparison retains every plan field,
error and exact replacement string, using only the established JavaScript
Number representation normalization on both complete JSON operands.

Frozen `pnpm test:native-lifecycle-reference` passes both complete corpus tests
in `6fe39166-7a78-4748-a79f-fe05f2eea243`, with zero failures. Full
`pnpm validation:all` in `5c56f27e-a4d3-4a77-89e8-a3e70aba213c` completes
every product lane:
check, all 29 native and 2,849 TypeScript cases, build, publint, static Storybook
and all 62 cold catalog cases pass. Its final specification gate reports one
`SPEC-FIRST-MISSING` finding because the protected reference fixture also maps
to `spec/src/plugins/tasks/index.md`. The canonical index now records the
separate valid-duration corpus. Exact `pnpm spec:check` passes in
`ed0eddaa-f35c-4018-8b04-0a0018f904a8`; that governance failure moves from
one to zero. The failed aggregate remains recorded with its actual status.
After final documentation formatting, exact specification acceptance also passes
in `512e159e-911e-414e-b6fa-8773ada444fe` with zero findings.

The final byte audit preserves the original lifecycle corpus exactly, with its
SHA-256 above. Only the eight new/changed reference-test, fixture, canonical
documentation and evidence paths differ from the qualified parent. Production
TypeScript/native files, all prior fixtures, Cargo manifests/lock and public DTOs
remain unchanged. No package publication, consumer fallback, new runtime
implementation or host selection is part of this source-qualification extension.
