# Native date-only recurrence source intake

Status: qualified private native source; retained parity and all required source
gates pass. No host selection is active.

## Bounded functionality and retained source

LN-TASK-075 through LN-TASK-077 govern a pure date-only recurrence set and
an effective-occurrence resolver with explicit local today. They own no clock,
filesystem, database, scheduler, materializer or mutation. This changes no npm,
HTTP or Tauri contract. Additive read-only exports stay in the existing
`publish=false` native Tasks crate, as explicitly approved for this source slice.

The clean isolated [Docker/parser intake](2026-10-25-native-task-docker-intake.md)
commits `5695cc11`, preserving immutable document parser `f06b79b4` and verified
Docker tooling `3b6cada3` as separate parents. The default Tasks workspace stays
clean on its existing commit; the earlier recurrence draft remains preserved.
The current working workspace has committed Docker-first defaults.

The retained TypeScript implementations are unchanged:

- `recurrence-engine.ts`: analysis and date-only next/previous/between through
  pinned `rrule@2.8.1`, with explicit DTSTART/RDATE and EXDATE precedence.
- `effective-occurrence.ts`: six effective states, carry/skip, absent completion
  origin, lifecycle counts and inclusive pause ranges.

## Frozen complete-output corpus

Ignored capture worker `22d70c6a-7681-4aff-8f20-0d37baa96f0c` transfers exact
source `39296fad` and ancestry, verifies every source/public archive checksum,
restores tracked dependency files and captures the unchanged TypeScript output.
The one-time capture module runs through Vitest in an isolated Docker worker;
normal tests consume frozen results and never regenerate expectations.

The corpus contains 32 date-set scenarios with 166 query inputs and 18 effective
occurrences. Five date-set constructors deliberately fail; the other scenarios
execute 141 complete query envelopes. All 32 analyses and constructor outcomes
are compared. It covers every executable key, all effective states, calendar
month ends/leap years, inclusive/exclusive/reversed bounds, explicit set
precedence, pause/lifecycle rules and the compatibility cases below.

Frozen recurrence SHA-256:
`04441fec4d1761114f9044db1ac5881f58c69cb8fa1f65cc1ad9f94e7b7bb13f`.
Frozen effective-occurrence SHA-256:
`ba4d41fef91cd05b296b55f2632ae2a5b421866e4a539aa3d24cabef947effeb`.
Those files are copied byte-for-byte into the shared committed test inputs.

## Native implementation and compatibility

Pinned native `rrule=0.14.0` supplies calendar generation and interval handling.
Its license is MIT OR Apache-2.0 and its supported Rust floor is compatible
with this private crate's declared Rust 1.85 floor. The locked source gate uses
Rust 1.99.0; no broader minimum-version claim is made.

The adapter reuses the document parser's existing retained rule classification
and date validation. Separate source modules own records, engine/set queries,
primary library configuration, strict-library compatibility and effective policy.
The public native errors retain the TypeScript constructor names/messages/parts.

| Retained behavior                                                                   | Bounded native adaptation                                                                                      |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Nonmatching DTSTART still participates; RDATE may precede it.                       | Explicit inclusions are independent of primary rule COUNT and keep set ordering/deduplication.                 |
| EXDATE wins over all sources.                                                       | Query results apply the explicit exclusion set after primary generation/count.                                 |
| COUNT=0, INTERVAL=0 or UNTIL before origin leave explicit inclusions.               | Omit only the empty primary rule.                                                                              |
| Monthly positions beyond available dates and impossible month filters are accepted. | Remove impossible candidates while retaining explicit inclusions; mixed feasible positions remain active.      |
| Ordinal BYDAY in daily/weekly rules is treated as ordinary weekdays.                | Pass ordinary weekdays to the native library.                                                                  |
| Weekly BYMONTHDAY and retained ordinal bounds exceed native validation.             | Library-generated period candidates receive the retained day/position filters and COUNT, before set exclusion. |
| Completion and schedule effective policies have no side effects.                    | Resolve against explicit today/plan and normalized metadata without changing files.                            |

No supported captured rule becomes unsupported or exhausted just because the
native library validates its syntax more strictly. No recurrence engine is
copied into Notes or a host. Complete version-4 row normalization remains the
next private consumer; whole-vault structures, publication, local-date
scheduling, completion/skip/pause writes and daily observations stay separate.

## Exact before and after

Canonical `pnpm test:native -- --test recurrence` first fails in fresh source
`99f835d5`, run `1ff05894-42f9-40ac-86ed-e0ec7915334b`: the three new exports
are absent, yielding four compilation errors and zero executed cases. Compiler
inference warnings from those missing names remain in the original receipt.

After implementation, the exact unchanged target passes both integration tests
in run `b44cc2ee-2177-44b1-b257-bacf9365f501`, source `e8eba2aa`: all 32 complete
date sets and all 18 effective outcomes match, including the 141 query result
envelopes and five constructor errors. The native target finishes with zero
failures and no warnings. Existing document/occurrence and complete package
gates remain separate until the final source run below.

## Authoring attempts and runtime identity

A first ignored lock/format worker `4d04f905-c513-465c-aaec-fc5361042329` cannot
write the immutable input's host-owned Cargo.lock after capabilities are dropped.
No tests execute. The authoring helper now copies the verified input into its
owned working directory, matching canonical checkout ownership. Repaired worker
`29e68375-26be-4c27-919c-a02450a9b29a` generates the locked dependencies and
runs pinned rustfmt. No capability, permission assertion or product policy is
weakened. The original failing receipt is retained.

Both authoring probes report the actual explicit pnpm store `/cache/pnpm/v10`.
The image uses `/cache/cargo` and `/cache/target` for native caches. All workers
are bounded to four CPUs/12 GiB; only one runs in this lane. The pinned image is
`sha256:32c745d2c3bd24816b49548c72888ce5b4a09f5cdbb6bb03eeeba06fd750bfe3`,
with Rust 1.99.0 and pnpm 10.32.1. No host source/dependency mount or fallback is
used. Canonical native before/after use frozen registry installation; capture
uses the explicit 16-archive qualified source cohort. Their identities and
qualification are separate in the receipts.

The retained-reference test compares JSON-serialized effective output, preserving
the deliberate distinction between an omitted optional date and the TypeScript
object's own undefined field. It does not alter the oracle implementation.

## Separate downstream acceptance

This slice changes no npm runtime, presentation, Storybook fixture or shared
test setup, so the unchanged presentation retains `3b6cada3`'s separate
62-case catalog receipt. Visual approval, publication, Notes parser/engine
adoption and both host selections remain pending.

## Full-check intake repair

Full `pnpm check` run `a02ea538-351b-4efd-bc1b-7bcc652750a8`, source
`28009a97`, passes routing/parity before specification validation reports four
unknown references. The intake copy selected unpadded IDs and omitted canonical
definitions and verification rows LN-TASK-075 through LN-TASK-077. The correct
zero-padded rows are restored from the preserved draft. This run reaches no
Svelte, TypeScript or Clippy stage and is retained as failed evidence.

The repaired full check `d4e27551-97b5-4ad2-a9e5-2bdb0e306ddf`, source
`e4b8f854`, passes routing, composition, specification, ownership, Svelte, types
and strict Clippy. Its final rustfmt stage reports one wrap-only difference in
the newly added compatibility test. The exact suggested formatting is applied
before rerunning the command; no implementation or assertion changes.

## Separate retained ordinal compatibility fixtures

The original 32 date sets and 18 effective inputs retain the SHA-256 values
above, unchanged. Explicitly approved separate capture worker
`c8cccf74-c489-4057-ad6e-2c452ceecfc4`, source `fe8d7cf7`, records unchanged
TypeScript output for monthly `BYDAY=-5MO` and yearly `BYDAY=-53MO`.
`recurrence-compatibility-inputs.json` contains two cases and 16 complete query
envelopes, covering inclusive bounds, exhaustion, COUNT, DTSTART/RDATE/EXDATE
precedence and a monthly BYSETPOS filter. Its frozen SHA-256 is
`5ce22d9531b6829ec27b57f105e32c2e78c1529e59ce4113238284457c194ceb`.
These are additional fixtures, not a regeneration of prior expectations.

Canonical exact native run `fd820857-dcdf-41fe-921a-c56f156e9317`, source
`e4b8f854`, passes all three recurrence integration tests with no warnings:
the original 32/18 corpus plus the two additional cases. Total date-set
coverage is 34 constructor/analysis outcomes, 182 query inputs, 157 executed
query envelopes and five retained constructor failures. All 18 effective
outcomes remain separate.

The exact full check after intake/format repairs passes in
`0ff03913-b9c0-47e1-8c19-ed7b6c47f38f`, source `751c1a57`: routing,
composition, specification, App ownership, Svelte (zero errors/warnings), types,
strict Clippy and rustfmt. All failures above remain recorded.

## Retained-reference and complete package tests

The first combined focused run `28a97719-a212-40ea-b2de-d64652e6bb0b`, source
`b48558ed`, passes the original 50 shared-fixture cases, six existing engine
cases and five existing effective cases: 61 TypeScript cases plus all five then
present native integration tests. After the two separately captured cases are
added, the exact focused command
`pnpm test -- src/lib/model/recurrence-native.test.ts src/lib/model/recurrence-engine.test.ts src/lib/model/effective-occurrence.test.ts`
passes 63 TypeScript cases and all six native integration tests in
`1f6d06f0-f20b-4ece-9625-42f98915f8d9`, source `751c1a57`.

Complete `pnpm test` passes all 402 unit cases across 45 files and all six native
integration tests in `f80aa1e9-279d-433b-8b5b-b6f0a2285f54`, source `cdd7bda6`.
It retains all 75 document and 27 occurrence comparisons plus the date predicate,
34 complete date-set analyses/constructor outcomes and 18 effective results.
No functional regression or accessibility lane is waived by the earlier authoring
failures. Existing peer-range/install advisories are retained unchanged in logs.

## Build and package gates

Canonical `pnpm build` passes locked native compilation and the Svelte package
build/publint in `663659e5-c880-47cb-9524-80f2b6c0f04f`, source `cdd7bda6`.
Standalone `pnpm publint` also performs its own fresh Svelte build and passes
in `69ce8b7d-7b55-46e2-8f1e-620063b633c8`, source `cdd7bda6`.
They use the same verified 16-archive source cohort as the focused/full package
checks; no tracked manifest or lockfile is changed to an archive path.

Full version-4 Task row normalization is the following private source slice.
Whole-vault structure resolution, database publication and either host's writer
selection remain unimplemented here. No date-sensitive runtime output is
published by this engine, and no user data or Markdown is changed.

## Final specification and handoff

Registry-only `pnpm spec:check` passes routing/composition audits, all nine
specification validators, mdbook, spec-first and App ownership in
`968cd6e2-1462-46a3-8a49-aecbfb387099`, source `5de02d47`.
The canonical verification rows LN-TASK-075/076/077 now record source completion
while keeping projection and host adoption separate.

All authoring failures are repaired: missing-export compilation 4 -> 0,
unknown-reference specification diagnostics 4 -> 0, and one rustfmt difference
1 -> 0. Final native/functional failures are zero. No committed historical
record or original corpus byte has changed. The default Tasks workspace remains
clean at `3b6cada3`; this isolated source slice retains parser/Docker intake
`5695cc11` as its parent.
