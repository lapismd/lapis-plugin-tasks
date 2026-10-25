# Native Tasks YAML reader source prerequisite

Status: source qualified; consumer adoption separate. Last updated: 2026-10-25T23:24:00Z.
Requirement: LN-TASK-090. Root task: R3.2.1.2.10 source prerequisite.

The metadata reader is the owning boundary for YAML scalar semantics. The
original libyaml reader changed authored U+0085 into spaces and treated plain
U+2028/U+2029 differently from the retained YAML 1.2 implementation. The native
transformation matrix revealed the defect; no transformation wrapper or source
text substitution was added.

Pinned `saphyr=0.3.0` supplies native YAML 1.2 values. Its core scalar
resolver retains yes/no/on/off strings and exact boolean spellings; merge keys
remain ordinary keys and duplicates fail. The owning adapter retains ordered
values without enabling filesystem or interpolation capabilities. Existing
`serde_yaml::Value` retains ordered metadata for the serializer. No public
function/value contract changes or host adoption are part of this prerequisite.

## Evidence

The 18 complete frozen snapshots were captured by unchanged TypeScript
`parseTaskDocument` from `fcb2a8b5` in isolated worker
`397d2002-d6e6-49e7-86c9-00ad87fa7793`. Inputs cover JSON and serialized YAML,
double/single/plain Unicode scalars, malformed literal-block rejection,
aliases, duplicates and scalar spellings. Existing 75 document snapshots remain byte-identical.

Exact original reader target: `cargo test --locked --manifest-path
crates/lapis-task-services/Cargo.toml --test documents`. One original-corpus
test passed; the new test failed with seven complete differing snapshots.
`2026-10-25-task-yaml-reader-before.json` retains all exact outputs and source
identity. The first new-reader run kept all 75 original snapshots and repaired
all seven Unicode cases but exposed one yes/no duplicate-key inference error;
explicit YAML 1.2 options repaired that setting. Source review then found that
its case-insensitive boolean inference still differs from the retained core
schema. That candidate remains evidence only; the direct `saphyr` value loader
is the final source choice. Twenty-one additional complete frozen scalar/mapping snapshots qualify that
choice. The discarded candidate differs on exactly two retained inbox values
(`tRuE` and `TrUe`); `2026-10-25-task-yaml-core-candidate-before.json` retains
both complete expected/actual results.

## Qualified result

Exact native document/scalar targets pass all 114 complete snapshots. The
retained TypeScript test passes 39 cases. The full owner run
`65bb5f88-a3f4-4253-84bc-ef1d948ebbbc` passes check, strict Clippy/format,
16 native tests, 1,074 unit cases, locked build, package/publint, static
Storybook, all 62 cold catalog cases and canonical specification gates. There
are zero functional or accessibility failures. Visual approval and all consumer
adoption remain separate. No prior fixture or TypeScript model changed.

The earlier full discarded-candidate run passed code/unit/catalog lanes but
stopped at one missing mapped index chapter; the required index update is in
this slice and the final canonical lane passes. No failure was waived.

`2026-10-25-task-yaml-reader-provenance.json` records exact source/image/archive
identities, timestamps, hashes and counts. Source qualification uses the
existing verified Tasks sixteen-archive cohort in one serialized slot-3 Docker
worker, four CPUs, 12 GiB RAM and 2 GiB shared memory. Registry manifests and
lockfiles are restored before package checks. The new Rust lock entries are
additive; no original dependency version changed. There is no host fallback or
default provider change.
