# Shared registry installation readiness

Enclosing change: `txyuxsus`, based on maind720160e. Requirements:
LPT-SPEC-014/019/020/021. Product version0.2.1, runtime ID and public package
contracts remain unchanged. The maintenance changeset creates no version intent.

The original exact Docker target was
`pnpm ci:unit -- scripts/release-install-readiness.test.mjs -t 'binds installation readiness'`:
1 failure becomes1 pass (four other cases unselected). The complete affected
release boundary passes39 tests across six files in the governed worker,
including real existing Sigstore/Rekor policy regressions.

A second exact Docker target restores only the original receipt field before
testing `scripts/release-install-integration.test.mjs -t 'skip-different installation'`.
The original local-candidate integrity reproduces1 failure; the corrected
verified-published integrity passes1/1 (three other cases unselected). Production
code was restored before further validation. The integration tests also reject
strict candidate mismatch, tampered published bytes and missing shared setup
before acceptance commands. Frozen npm ci, strict peers, signature verification
and publint still execute after readiness.

The shared setup is pinned to Lapis CIc9fed365, preserving Tasks' actual
npm12.0.2 install policy. Shared-source qualification proves156 source tests and
21 isolated npm12 tests, including actual npm/pnpm registry propagation and
owned process cancellation. Its hosted qualification/landing remains a separate
dependency; this source cannot land first.

The five-minute readiness deadline starts before full registry-version lookup
and covers tarball observation and initial clean install. It supplies only the
remaining budget to the common helper, preserving the five-second backoff and
preventing a second independent grace window. Exact published name/version/SRI
owns skip-different installation; the local candidate cannot substitute its bytes.
No upload retry, tag movement, publication or signing bypass is introduced.

The required validator update changes only the released Node-only0.2.0→0.2.1
development resolution. Doctor and semantic QMD discovery pass. Portable tests
use the default Docker context, frozen registry-only dependencies, isolated
snapshots and no host fallback.

The release script imports a new pure helper. The updated guard file binds that
entire four-file closure and keeps the source-owned CLI3/pnpm/version command
unchanged. Those binding bytes are a review proposal, not proof: a fresh actual
hosted whole-version-recipe run on the exact source is required before landing.
The prior recipe receipt must not be claimed for changed source bytes.

Fresh full and production pnpm audits both exit0 under the unchanged existing
policy. Production has zero findings; full metadata retains the existing LOW
deepmerge count, with no MODERATE/HIGH/CRITICAL findings or new exception.

Local Docker gates pass: `pnpm spec:check`, `pnpm check`, `pnpm test`, `pnpm build`
and `pnpm publint`. The full unit lane passes2952 tests and native Rust lanes
pass29 tests. The first specification check correctly identified the package
manifest's missing mapped index chapter; its owning evidence was added and the
same check passed. No story/presentation/runtime implementation changed.

The actual retained250973-byte npm0.2.1 candidate fromd720160e also passes the
new verifier with the sharedc9fed365 helper and isolated checksum-bound npm12.0.2.
Exact integrity remains
`sha512-qQirkbxAOR0x2r08yyd3D2pflO+LkEg8LL5DsWU/2nRg3ro4DwbYExaB5pJ8W7W99oQfD9ww11wZts9VdEQtlQ==`.
Installation readiness completed in22.477seconds; frozen npm ci,509 registry
signatures,123 attestations and publint pass. The first attempt hit `/tmp`'s
inode limit during npm extraction and correctly stopped without retrying
EEXIST/ENOSPC. `/tmp` had only69619 of1048576 inodes free after cleanup. Selecting
an owned disk-backed TMPDIR repaired the environment; the same verifier passed
without assertion changes or unrelated cleanup. No credential was supplied,
artifact rebuilt, registry upload attempted or GitHub release modified.

Tasks dependency PR22 was closed as superseded after verifying that current
main already declares the exact dev floor`^0.13.4` and locks Core0.13.4. The
compatible public peer remains`^0.13.2`; no peer-floor bump was manufactured.

Pending: full hosted PR CI, immutable shared source landing and fresh
whole-version-recipe proof. Binding metadata is not authority to merge before
that proof. Visual, native platform, consumer adoption and actual new publication
remain separate evidence. No release is manufactured for proof.

## Actual hosted whole-version-recipe proof

Accepted shared main ec098c22 hosts run43938641222, successful at
2026-11-16T19:22:44.201Z for exact Tasks source
`6b896f6d33bd5256c0838c6fde5e8effd6cff7dc`. All13 reviewed input hashes match
both the case and unchanged owning source. The actual CLI3.0.3 command on
Node24.15.0/pnpm10.34.5 executes after the frozen setup and runtime guard, with
Deno absent. It prepares only Tasks0.2.1→0.2.2 inside the disposable fixture.
The authentic historical patch note is validation input with
currentReleaseIntent=false; no runtime version or release intent changes here.
No writer App, package, tag or release is published by qualification.

The first actual attempt43934760205 correctly failed the proof's incomplete
changed-path contract. The immutable source also has the older empty
`.changeset/maintenance-rekor-recovery.md`, which Changesets consumes. Shared
PR19 binds that exact100a32a4…dd4253 source hash and both explicit empty-note
paths. Each may remain byte-identical or be consumed; changed body, new release
intent, missing hashes or unrelated paths reject. The exact expanded original
positive target reproduced1 failure before this repair and passed1/1 afterward;
40 focused Tasks/Docs tests and199 full shared tests pass. No owning version
command, compatibility baseline or source implementation was changed for proof.

The successful actual receipt verifies coordinated package/runtime versions,
unchanged parsed lock graph, marker-only canonical change, unchanged bound
helpers/workflow/config, changelog preparation and consumption of both reviewed
empty notes. There are no unrelated changed or untracked output paths.
Receipt SHA256: `2bcab8c4f4754619c89c5509c5c649f284a3b06ac0494ba06d5d7a671502aa80`.

All ten original PR30 checks passed on6b896f6d. This record-only child changes
none of the13 qualified inputs or the four-file recipe input closure. The actual new recipe proof now closes its pending gate;
fresh final-head CI and actual main publication/consumer verification remain
required before deployment is qualified. Prior local2952-unit/29-Rust lanes
and genuine retained npm0.2.1 acceptance remain separate evidence. Existing
LOW policy and every other audit failure are unchanged and not renewed.
