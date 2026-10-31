# Tasks npm publication qualification

This record supports LPT-SPEC-020 and LPT-SPEC-021. Canonical release behavior
and status remain in `spec/src/spec-governance.md` and `spec/src/verification.md`.

## Reproduced boundaries

- The registry-only `pnpm check:svelte` baseline failed with 16 errors, zero
  warnings and seven affected files. Existing CI run
  [41097632606](https://github.com/lapismd/lapis-plugin-tasks/actions/runs/41097632606)
  shows the same missing native Tasks API and duplicated API identity failures.
  Released API 0.2.0 and the matching host cohort reduce this exact check to
  zero errors and zero warnings.
- Updated Storybook initially failed one static build because docgen received
  uncompiled Svelte. Ordering the package compiler before framework docgen
  restores the cold static build.
- Vite 7.3.7 with the Svelte Vite 6.2.4 compiler produced seven import-failing
  suites in browser shard 1, with virtual CSS falling through to raw Svelte.
  The compatible Vite 6.4.5 / Svelte Vite 5.1.1 cohort passes that exact shard:
  13 tests, zero failures. No diagnostics were suppressed.
- The complete registry run passed 27 native tests, 2,886 unit tests, strict
  checks, package build/publint and static Storybook. Its catalog result was
  62 passed / one failed across 63 tests. The failure was `LiveEditMutations`;
  the exact focused command reproduced it before edits.
- Live mutation acceptance now preserves every source/edit/reorder assertion
  while waiting for the saved order and reacquiring visible rows before the
  next interaction. This reaches deletion and exposes the separate published
  Design Core 0.7.1 `derived_inert` defect in Swipe Item action teardown.
  That owning-package repair is included in the pending Design Core 0.7.2
  release. Tasks neither suppresses the diagnostic nor changes the component.

## Independent tooling evidence

Docker `pnpm spec:check` passes 118 requirements, spec-first, mdBook and App
ownership checks. The six release guard tests and all 27 native tests pass.
The added guard proves temporary archive installations are rejected before
release preparation. Actionlint and the routing audit pass. Doctor verifies the Node-only validator
and QMD collection; its alias warning reflects the required Docker routes.
`pnpm spec:search --semantic` returns canonical release requirements.

The standalone Docker `release:prepare` lane builds and lints its input before
packing. Its internal 0.1.0 artifact has 290 entries, includes the runtime
manifest and AGPL license, excludes source tests/stories, and matches package
identity and SHA512. This validates preparation; it is not public publication.

## Temporary source acceptance

The Design Core release candidate is a source-validation artifact, distinct
from the published npm 0.7.1 implementation. Its source is
`7f5801601ea744e5232e4683c51bba48fbe03ae6`; its SHA256 is
`79ff0e66af1cf424405d5d33af843e27c5ab65fd3af569ae103901ec7a06a17f`.
Isolated archive intake verifies that identity and checksum and restores tracked
registry manifests/lockfiles before checks. The exact `LiveEditMutations` target passes against that verified archive with
the fatal diagnostic guard enabled (one passed, zero failures). The complete
consumer catalog also passes all 63 interaction/accessibility cases across
three cold shards (13 + 9 + 41), with zero fatal Svelte diagnostics. Actual Tasks
publication still requires final qualification against downloadable Design Core
0.7.2.

The real `pnpm release:version` command was also exercised reversibly. It
advanced package and runtime manifest to 0.1.1, consumed the patch changeset,
created the changelog and synchronized the canonical declaration. Docker
`pnpm spec:check` passes on that generated version shape. The exact original
Jujutsu source tree was then restored so the bot retains ownership of the actual
Version Packages PR.

## Publication boundary

The normal patch changeset advances the existing unpublished 0.1.0 source to
the first public 0.1.1 package. The Version Packages PR must pass and merge;
its exact main source must then pass every Docker gate and produce the immutable
artifact plus verified npm-compatible Sigstore provenance. Publication remains
incomplete until npm downloads/signatures, strict-peer clean consumer checks and
the package-scoped GitHub release succeed. Signed registry onboarding, visual
approval and application adoption remain separate. No visual baselines changed.

## Sigstore identity correction (2026-10-31)

The real public-library regression reproduced one failure: Sigstore 4.1.1
accepted a valid Design Core bundle when the old three-argument call silently
discarded the issuer/workflow policy. The corrected two-argument call and exact
returned signer checks retain cryptographic verification and reject foreign
workflow identity and payload tampering. The public fixture comes from npm
provenance for `@lapismd/design-core@0.7.1`, has 12,005 bytes and SHA256
`e68da538522ac91ccf86a1ca0472c71f3895e79a1adf997e27155911c07d7c60`. It
contains public certificate/signature material and no signing or npm credential.
No Tasks bundle or package was published before this correction.

The exact Docker verifier regression changed from one failure to zero, and all
seven release guards plus 27 native tests pass. Canonical spec-first/mdBook/App
ownership checks pass after the correction. Hosted source CI run
[41147072385](https://github.com/lapismd/lapis-plugin-tasks/actions/runs/41147072385)
independently reproduces only the assigned Design Core 0.7.1 Swipe Item
diagnostic; its artifact and publication stages remain blocked.

## npm predicate compatibility (2026-10-31)

The exact npm-PURL regression reproduced one failure because the predicate
omitted npm's GitHub internal metadata. The generator now includes the admitted
event and verified numeric repository/owner ID strings, rejects foreign IDs,
and restricts signing to main push or manual dispatch. The exact Docker target
changes from one failure to zero; all seven release guards and 27 native tests
pass afterward. Canonical spec-first/mdBook/App ownership checks pass. Hosted
run 41149098975 independently retains the same single Design Core 0.7.1
`LiveEditMutations` diagnostic. No package publication has occurred.

## Refreshed Core acceptance and runtime security gate (2026-10-31)

The later Core source archive includes the Bits UI 2.20.2 and patched minimatch
cohort. Its source is `fd1748bed97b32cb2d956e74b4f338b42f86fa80` and SHA256 is
`0af4b94fcfb40a56037ea057c47352eca023d69408dd2559e0ab4010d5ccb74d`. The archive
still identifies itself as pre-version Core 0.7.1; it is source acceptance,
not an npm 0.7.2 publication receipt. The isolated installation verifies the
archive and restores the tracked registry manifests and lockfile before checks.

With `LAPIS_TASKS_VALIDATION_ARCHIVES` selecting that verified descriptor:

- `pnpm test:storybook -- src/stories/PluginWorkspace.stories.svelte -t LiveEditMutations`
  passes one exact cold case, with zero failures and 23 intentionally filtered
  cases; the registry Core 0.7.1 baseline has one failure.
- `pnpm test:storybook` passes all 63 interaction/accessibility cases in three
  fresh-process shards (13 + 9 + 41), retaining the fatal diagnostic guard.
- `pnpm check` passes routing, 24 composition families, 118 requirements,
  App ownership, no-Tailwind, Svelte (zero errors and warnings), TypeScript,
  native Clippy and Rust formatting.

The retained Docker reports are
`lapis-tasks-run-35f49bd9-afb5-429c-97cf-71e0f8f71a74` (exact),
`lapis-tasks-run-cc729ffa-3f3b-40f1-9b5f-1e1c6bf9e22a` (complete catalog), and
`lapis-tasks-run-c35ecc53-3d2b-478c-96ee-400c6a98686c` (strict checks).

The current public runtime/peer closure contains 546 reachable packages and no
unresolved edges. API 0.2.0 and Core 0.7.1 each introduce minimatch 10.2.6,
affected by GHSA-g3hv-75wg-m249 (versions below 11.0.1). Publication therefore
also requires the owning API 0.2.2 and Core 0.7.2 releases, peer/development
floors of `^0.2.2` and `^0.7.2`, a refreshed registry lock and a repeated runtime
closure check. No override or new audit exception is accepted. The final
registry-only `pnpm validation:all`, protected source/version PR merges,
immutable artifact, actual npm verification and GitHub release remain pending.

## Combined fixed API and Core source acceptance (2026-10-31)

The source-qualified cohort also includes API source
`5a24816e7e5770dacbff69604cdff589f480cd38`, packed through its normal public
prepack, publint and package-type checks. Its pre-version package identity is
`@lapis-notes/api@0.2.1` and archive SHA256 is
`b350f0f8b509c443350982840de8806884a15ff20afe2ec970236e52e69af9c4`.
Every archive member matches the API owner's fully qualified public pack.
The combined descriptor retains Core `fd1748be` and its checksum above.
Both archives are verified only inside the isolated installation projection.

With `LAPIS_TASKS_VALIDATION_ARCHIVES` selecting that combined descriptor,
the exact cold `LiveEditMutations` target passes one case with zero failures
(23 deliberately filtered), followed by every affected consumer lane:

| Command                | Result                                         | Retained Docker report                                 |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| `pnpm check`           | All strict checks; Svelte zero errors/warnings | `lapis-tasks-run-d974e1ab-89e4-45fe-8bf4-e1d46bf25fae` |
| `pnpm test`            | 2,889 unit and 27 native cases passed          | `lapis-tasks-run-01a12095-36d6-4903-9e1d-ebe358c5b2a6` |
| `pnpm build`           | Native and public package builds passed        | `lapis-tasks-run-c60e24ca-8a8b-4da9-8560-b649680b9a78` |
| `pnpm publint`         | Fresh public package build and lint passed     | `lapis-tasks-run-12349165-d11f-42eb-bbc5-c1cef03e4d50` |
| `pnpm build-storybook` | Cold static catalog passed                     | `lapis-tasks-run-457360f7-5d07-40bd-bbaa-d26bd6554f4d` |
| `pnpm test:storybook`  | All 63 interaction/axe cases passed            | `lapis-tasks-run-2769ee64-71d1-4142-8b59-c832d43aa49c` |
| `pnpm spec:check`      | Spec-first, mdBook and ownership passed        | `lapis-tasks-run-94939119-2e42-4da6-a560-847d601096df` |

The exact target report is
`lapis-tasks-run-09cc7429-1444-4996-a45a-91d3bd91fd15`. The fatal diagnostic
guard remains enabled throughout the cold catalog. There are zero functional,
interaction or accessibility failures in this source-qualified cohort.

Its actual installed runtime/peer closure has 547 reachable packages, zero
unresolved edges, and both API and Core minimatch paths resolve to 11.0.3.
No vulnerable minimatch parent remains in that graph. These preliminary source
archives are distinct from actual API 0.2.2 and Core 0.7.2 registry releases.
Final published floors, registry-only qualification, protected source/version
PR merges, immutable publication and verified release receipts remain required.

## Current upstream release hold (2026-10-31)

The Core release owner has identified a further upstream Bits UI same-container
FocusScope remount defect. Its owner candidate `692fbdf5` is newer than the
`fd1748be` Core archive qualified above. The exact owner regression is repaired,
but the required complete upstream browser lane remains unqualified and the
accepted Core/Bits cohort has not been released. Earlier Tasks source receipts
remain valid only for their recorded trees and do not qualify that later cohort.

Publication stays pending until legitimately released compatible Bits/Core and
API 0.2.2 packages are downloadable. Adopt the accepted published Bits cohort in
Tasks as needed, retain the planned API `^0.2.2` and Core `^0.7.2` floors, then
repeat the exact cold regression, complete runtime/peer closure audit and final
registry-only `pnpm validation:all`. Source and Changesets PR checks, reviewed
current-base merges, immutable artifact/provenance production, actual npm
verification and the scoped GitHub release remain blocking. No source-archive
substitution, diagnostic exception or visual baseline change qualifies release.
