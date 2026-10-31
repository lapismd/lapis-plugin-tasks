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
