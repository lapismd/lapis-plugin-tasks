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

## Registry cohort refresh and complete release ownership (2026-10-31)

Registry metadata now supplies API 0.2.2, Design Core 0.7.2, UI 0.1.5 and
Mira 0.1.3. Tasks adopts API `^0.2.2`, Core `^0.7.2`, UI `^0.1.5` and
Mira `~0.1.3` in the tracked manifest and frozen registry lock. The latter two
satisfy API 0.2.2's current peer contracts. No archive or package override is
involved. The Deno-free spec validator remains the current npm 0.2.0 release;
doctor and semantic QMD discovery pass with the installed Node 24 runtime.

The exact cold registry-only command
`pnpm test:storybook -- src/stories/PluginWorkspace.stories.svelte -t LiveEditMutations`
still fails one case, with 23 deliberately filtered cases. Its retained Docker
report is `lapis-tasks-run-8902a8ec-97d3-4338-b742-250078a9a3a6`. The fatal
`derived_inert` diagnostic originates in published Core 0.7.2
`SwipeItemState.close` after the Swipe Item action destroys its owner. Thus this
new registry version does not contain the already prepared owning fix in
[Design Core PR #42](https://github.com/lapismd/design-core/pull/42). That fix now
requires the next Core patch release; the earlier record's expected 0.7.2 fix
number was superseded by a separate successful release. No assertion or
runtime-diagnostic guard was weakened, and Tasks remains unqualified for merge
or publication until the repaired registry cohort passes.

The registry-only strict check passes (zero Svelte errors and warnings), all
2,889 unit and 27 native tests pass, and the native/public builds plus publint
pass. Their Docker receipts are respectively
`lapis-tasks-run-afbcc092-877c-4251-99d8-5193f1a31e78`,
`lapis-tasks-run-c7a20b99-265c-4ba5-bca5-a00547fcdaa0` and
`lapis-tasks-run-2989cc73-ee86-4876-85b9-cb1a3da14e1b`. The actual frozen
installed runtime/peer closure has 547 reachable packages, zero unresolved
edges, and API/Core minimatch paths both resolve to 11.0.3. This removes the
recorded runtime security gate while retaining the assigned browser failure.

The release owner must continue through review and approval of each ready
Changesets/version PR, a merge after required checks pass, protected release
approvals, completed publication workflows, and verification of the exact npm
version/artifact, provenance and package-scoped GitHub release. Opening or
merging a PR and dispatching a workflow are intermediate states. Required clean
consumer acceptance and immutable-version checks remain blocking.

## Authorized shared Bits UI root patch (2026-10-31)

The user explicitly authorized a package-manager patch exception for the existing
Bits issues. Tasks now tracks the exact shared three-file
`patches/bits-ui@2.20.2.patch` with SHA256
`debd3bc7d43917f0967f0cc1e212fc5c7721c751d3b92bf8f31030d1c96289ad`,
matching Core and Notes. The exact root override and `patchedDependencies`
selector target registry Bits 2.20.2; the frozen lock records that same patch
hash for every peer-specialized instance. No package fork, source dependency
substitution or ad hoc node_modules edit is involved.

The package comes from npm's `bits-ui-2.20.2.tgz`, integrity
`sha512-cb1eQD1wZEhJWb1dTLiAdYWqeUI5v7f+7EAHmetxBuELI9lo4cpAIfGEjald/PR4wTR80Fu5DFH+IaY1OKn+tg==`.
A fresh `pnpm patch bits-ui@2.20.2` extraction independently matches all three
shared preimages, and the complete payload passes `patch --dry-run -p1`.

| Registry file                                           | Before SHA256                                                      | Expected patched SHA256                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `dist/bits/link-preview/link-preview.svelte.js`         | `d1003472761d056c70c5dc06651473bdbcbfad4f53fea224021da65747135cc3` | `84ceb64f136ffd57c08973ffa70cdcbe8875000d10262244f2fc5dd36b626d14` |
| `dist/bits/slider/slider.svelte.js`                     | `8f78d5045adaf4cde3e8c051c50b5e50ce3715bcc2ffab2c3f529211f57c7515` | `99da433f4cc360138c73c4ba5d2a11083c4dc95720a09bbc8b7ec61e78d2f201` |
| `dist/bits/utilities/focus-scope/focus-scope.svelte.js` | `1ce5e39a89c8359778712f996193c65375287a0eceb9fde45186c7988c83dd1f` | `62c6ee5f7352531f61e465b38ae901bb9b3c2d1c3fb3d5bd7dc445e491a1e0f1` |

The LinkPreview deferred-selection timer repair originates in Plugins source
`bf492db552702fd310dcc6439152d42d472de068` (the existing 2.20.2 patch has SHA256
`d9b49a52c343dfbd392e235b5d748e5922f3e16e727cf92064437a95c90530f9`).
The Slider destroyed-state/six event guards originate in Plugins source
`201b1feb60fe97ee383ea30b061e453e1ad5e853`; the prior 2.19.5 patch has SHA256
`4fbe511eb1c148b33aa474fa3bd7efd13d8401111b37dbbb7f9bd64c951ec894`.
The two-line FocusScope same-container admission guard matches owner `692fbdf5`
and [upstream PR #2264](https://github.com/huntabyte/bits-ui/pull/2264).
Registry 2.20.2 already contains listener-safe LinkPreview cleanup, so the shared
payload does not duplicate that upstream implementation.

LPT-SPEC-022 governs this limited exception, per-root consumer propagation,
full graph qualification and removal after a qualified upstream replacement.
Patch files are protected by the spec-first governance mapping. The existing
Core 0.7.2 Swipe failure is a separate release gate; this Bits repair cannot
substitute for the required published Core Swipe/JSON fix.

### Tasks-root patched consumer qualification

The frozen registry installation has exactly one Bits peer-specialized instance.
Every transitive API, UI, Core and Mira dependency edge records the shared
`debd3bc7...` patch hash; there are zero unpatched Bits instances. The complete
runtime/peer closure remains 547 packages with no unresolved edges and patched
minimatch 11.0.3 on both API/Core paths.

| Docker command         | Result                                                          | Retained report                                        |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| `pnpm check`           | All strict lanes; Svelte zero errors/warnings; 119 requirements | `lapis-tasks-run-5e8b594c-fe51-4f25-a481-044183fde820` |
| `pnpm test`            | 2,889 unit and 27 native tests pass                             | `lapis-tasks-run-72823980-17d6-43d4-a76c-53018f047e3f` |
| `pnpm build`           | Native/public package and bundled publint pass                  | `lapis-tasks-run-b84ec80e-3b1f-4d53-862d-db97801c0e03` |
| `pnpm publint`         | Fresh public build and package lint pass                        | `lapis-tasks-run-993b1509-bac1-40e1-a7e1-00ed14e5482d` |
| `pnpm build-storybook` | Cold static catalog passes                                      | `lapis-tasks-run-f34c286c-f427-473b-9839-696f2cdbd91b` |
| `pnpm spec:check`      | Canonical validation, spec-first, mdBook and App ownership pass | `lapis-tasks-run-0c17ce63-9171-459d-8749-5196fd2ced14` |
| `pnpm test:storybook`  | 62 pass / one existing Core Swipe teardown failure              | `lapis-tasks-run-d01b325a-d1ed-4f75-aa51-43e237352376` |

The three complete cold interaction/accessibility shards report 13 passed,
9 passed and 40 passed / one failed. The sole failure remains
`LiveEditMutations` in published Core 0.7.2 `SwipeItemState.close`, identical to
the preceding registry-only reproduction. The explicit Bits patch adds no
new functional, interaction or accessibility failure and does not suppress the
existing fatal diagnostic. This is patch preparation, not a passing release.
Final acceptance still requires the fixed Core registry version and a fully
passing `pnpm validation:all` on that resulting graph before source/version PR
merges, actual npm publication and verified GitHub receipts.

### Final API lifecycle intake gate

The Notes owner has completed source qualification and pushed PR #51, with
hosted interaction/web gates and API 0.2.3 publication still pending. That
release carries the lifecycle repair required for the final host cohort.
Tasks must explicitly raise its API peer and development minimums to `^0.2.3`
and resolve the actual 0.2.3 registry lock entry after publication, even under
the owner's normal `next` tag. Keeping the earlier `^0.2.2` lock or obtaining
only a source-qualified archive does not admit that repaired release.

The final Tasks gate therefore combines actual API 0.2.3 and Core 0.7.3 with
the shared Bits root patch, followed by the original cold regression and
complete frozen-registry acceptance. The recorded API 0.2.2/Core 0.7.2 results
remain preliminary evidence, with the assigned Core Swipe failure unchanged.

### Registry-delivered patch assets for downstream roots

Core's public package supplies the authoritative `patches/manifest.json`,
`patches/bits-ui@2.20.2.patch` and `patches/README.md`. Tasks consumer guidance
uses those assets, verifies the shared payload hash, and requires all three
installed postimages from the manifest at the consuming root.

Read-only inspection of the owner-qualified prepared Core archive (package
source 95b70dd4, pre-version identity 0.7.2, archive SHA256
`b80ad762df4f4bd33f65e6cb895ac2827f9f28f21dbe202c9c11dc9c00592856`)
confirms that its manifest identifies Bits 2.20.2 and the exact shared patch;
the extracted patch hashes byte-for-byte identically to Tasks' tracked payload.
This is preliminary asset-layout inspection, not registry qualification. Final
Tasks intake must repeat the checks on actual published Core 0.7.3 and qualify
the installed patched graph with published API 0.2.3 before release.

### Actual API 0.2.3 registry intake

Tasks independently downloaded API 0.2.3 from npm and verified its identity,
743,727-byte size, SHA256
`00f234336b3dd33cbcd0814ae45e819dc82484497caa051cdac9571d17f43700`
and registry SHA512 integrity
`sha512-CGQQzAq/2aH3SDznhVIv/1oCictAxvXfLUiqQ4aYfmR0hN2YL/jTomH9sJn+gVSnSoeP4qyXXTMmRNrZfABM0Q==`.
The owner independently cryptographically verified the exact GitHub
`release.yml` signer and matching SLSA subject/source
`0d9d4d9253579541b1e796d7f2c68ef3b19a8df6`, run
[41190163735](https://github.com/lapismd/lapis-notes/actions/runs/41190163735).
Its fresh published-consumer gate and GitHub asset completion were still
pending at this intake checkpoint; artifact availability is not a completed
publisher release receipt.

The Tasks API peer/development minimum is now explicitly `^0.2.3` and the
registry lock resolves API 0.2.3. Its published UI/Mira peer contracts remain
compatible with UI 0.1.5 and Mira 0.1.3. The development Workspace host advances
from 0.3.0 to the owner's already published 0.3.1; no unpublished dependency
is introduced. Core remains at 0.7.2, so the required fixed Core release and
final original/full Tasks qualification remain outstanding.

The API publisher subsequently completed all 14 jobs in the same run, including
real publication, fresh published-consumer verification and GitHub release
[`api@0.2.3`](https://github.com/lapismd/lapis-notes/releases/tag/api%400.2.3).
The release tag/source is `0d9d4d9253579541b1e796d7f2c68ef3b19a8df6`.
Root independently downloaded the same bytes/hash. API publication acceptance
is complete; the remaining dependency gate for final Tasks acceptance is the
actual repaired Core 0.7.3 release.

The actual API 0.2.3/Workspace 0.3.1 intake passes Docker strict checks with
zero Svelte errors or warnings (`lapis-tasks-run-5d6b02fd-52ba-4445-85b7-49036295f979`)
and canonical spec-first/mdBook/App ownership
(`lapis-tasks-run-bf882a54-d051-44f2-8282-77acc6f68c92`). The installed lock
confirms the explicit API 0.2.3 and Workspace 0.3.1 entries, one patched Bits
instance across all four API/UI/Core/Mira edges, no unpatched instance, and the
same 547-package runtime/peer closure with no unresolved edges. Both minimatch
parents remain patched at 11.0.3. These are preliminary intake checks; the
original cold case and complete Tasks acceptance remain held for actual Core
0.7.3, rather than borrowing the older API 0.2.2 catalog result.
