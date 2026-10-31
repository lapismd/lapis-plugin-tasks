# Specification Governance

Tracked dependencies use registry API `0.2.0`, Design Core `0.7.1` and Mira `0.1.2`.
Explicit temporary source acceptance follows LPT-SPEC-014 with verified archives
in isolated installations. Source ownership and public contracts remain unchanged.
Shared specification tooling resolves the Deno-free `@lapismd/spec-validator@0.2.0` from npm.

## Requirements

| ID           | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LPT-SPEC-001 | `spec/src` MUST remain the canonical standalone specification and MUST build with mdBook.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| LPT-SPEC-002 | Protected package, manifest, source, Storybook, validation, and CI changes MUST update an owning canonical chapter in the same Jujutsu change. Host plugin-class registration is specified in LN-TASK-007 and does not move governance ownership.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| LPT-SPEC-003 | Every normative requirement ID MUST be unique and MUST have exactly one verification row with concrete evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| LPT-SPEC-004 | Published package manifests MUST use portable semver ranges and MUST NOT contain `workspace:`, `link:`, `file:`, or machine-specific dependency paths. Registry packages such as `yaml` MAY be added when the Markdown-first task model needs them. Recurrence execution MUST pin `rrule` exactly at `2.8.1` so library behavior cannot drift independently from its RFC compatibility tests.                                                                                                                                                                                                                                                                                     |
| LPT-SPEC-005 | Published LapisMD dependencies MUST resolve through npm semver ranges. Local package source or artifacts MAY replace matching install dependencies through `.pnpmfile.cjs` only when those paths exist; absent local paths and CI MUST retain registry resolution. External repositories MUST NOT become workspace members or mutate dependency `node_modules`. Workspace overrides MUST pin the CodeMirror and Lezer packages used by Storybook shell hosts.                                                                                                                                                                                                                     |
| LPT-SPEC-006 | Package Storybook MUST expose checkout-owned `storybook`, `storybook:stop`, and `storybook:restart` commands. They MUST default to port 7030, honour `.env.storybook.local`, reuse one supervisor per checkout, refuse to replace a listener owned by another checkout, apply exactly one Svelte transform pipeline to package and linked-source modules before Storybook docgen in the dev server and static build and within the browser-test project, and synchronously apply the selected preview theme before story play functions run.                                                                                                                                      |
| LPT-SPEC-007 | Tracked agent guidance MUST require explicit or context-owned App access, restrict `globalThis.app`, and require the package ownership audit for App-related changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| LPT-SPEC-008 | Repository validation MUST reject story titles outside the `Plugins/Tasks/*` taxonomy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| LPT-SPEC-009 | Repository validation MUST compare every SUMMARY chapter with an exact metadata-only Storybook mirror and MUST keep those mirrors as Storybook's first section in SUMMARY order.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| LPT-SPEC-011 | Tracked agent guidance MUST require preserving unrelated work, committing every independently verified change with Jujutsu without waiting for another request, and using a PR-quality message that explains what changed, why it changed, and which validation passed.                                                                                                                                                                                                                                                                                                                                                                                                           |
| LPT-SPEC-012 | Every executable Storybook family MUST declare application, component, integration or prototype coverage. The guard MUST follow its selected CSF-Svelte render path through actual imports. Application coverage MUST reach exactly one public WorkspaceShell; focused component coverage MUST identify the real rendered subject. Missing or stale declarations, unused imports, replacement roots and private production presentation overrides MUST fail checks.                                                                                                                                                                                                               |
| LPT-SPEC-013 | Portable root validation commands MUST default to the fail-closed Docker runner and be registered in the lane inventory. Every other root script MUST match an explicitly reviewed native development or bootstrap exception. Docker errors MUST NOT trigger a host fallback. Intentional native diagnosis MUST require an explicit runtime override.                                                                                                                                                                                                                                                                                                                             |
| LPT-SPEC-014 | Docker validation MUST transfer the exact tracked Jujutsu revision and ancestry without ignored local state, host dependency/source mounts or a Docker socket. Registry installs MUST be frozen. Explicit temporary archive acceptance MUST verify package identity and checksum, restore tracked manifests and lockfiles before checks, and record archive provenance.                                                                                                                                                                                                                                                                                                           |
| LPT-SPEC-015 | The Docker image MUST pin base and toolchain identities and install Chromium matching the locked Playwright version. Default browser acceptance MUST use sequential bounded shards and one worker. Explicit file, test-name and shard arguments MUST remain literal and MUST NOT be silently expanded into unrelated cases.                                                                                                                                                                                                                                                                                                                                                       |
| LPT-SPEC-016 | Synthetic story controls MUST use the visible padded dotted FixtureControls boundary. Application fixtures MUST use overlay placement outside production geometry; focused component stories MAY use inline placement. The boundary MUST NOT conceal production roots or dynamic component replacement. Functional acceptance MUST verify the visible boundary in an affected story.                                                                                                                                                                                                                                                                                              |
| LPT-SPEC-017 | Every Docker worker MUST have finite CPU, memory and shared-memory limits and a per-checkout lease. Reports MUST retain source, image, tool, argument and outcome identities with available outputs and combined logs. Cleanup MUST collect reports before deleting stopped owned runs and MUST NOT prune global data or delete another checkout's containers.                                                                                                                                                                                                                                                                                                                    |
| LPT-SPEC-018 | Browser acceptance MUST fail on Svelte runtime diagnostics from console warnings or errors, including mount, interaction and teardown. The guard MUST install before story hooks, retain original diagnostic stacks until post-test and post-file assertions without interrupting framework cleanup, and preserve console output without suppression or allowlisting.                                                                                                                                                                                                                                                                                                             |
| LPT-SPEC-019 | The classified validation:all command MUST execute the existing check, unit/native test, build, publint, static Storybook, complete catalog and specification lanes, then immutable release preparation, sequentially within one Docker snapshot and dependency installation. It MUST preserve first-failure propagation, refuse aggregate selectors and retain every individual command and exact target.                                                                                                                                                                                                                                                                        |
| LPT-SPEC-020 | Specification discovery MUST expose native `spec:search` and `spec:index` developer commands backed by the repository QMD collection. Conceptual discovery MUST use semantic search; search and index MUST stay outside CI and validation. Doctor MUST verify this wiring.                                                                                                                                                                                                                                                                                                                                                                                                        |
| LPT-SPEC-021 | Public npm releases MUST use Changesets version PRs and synchronize package/runtime-manifest versions. Main-source publication MUST consume the exact checksummed tarball produced after every Docker source, native and browser gate, with provenance. The workflow MUST verify the downloadable registry artifact, signatures and a clean registry consumer before creating the package-scoped GitHub release. Existing versions MUST be immutable; retries MUST compare bytes. Changeset/version/attest/publish/verify commands are reviewed native release bootstrap exceptions and MUST NOT bypass Docker qualification. Signed plugin-registry onboarding remains separate. |

Aggregate validation shares the outer worker's single lease, exact snapshot and
installation. Inner gates use the native execution port inside that worker;
they MUST NOT create nested workers or silently omit a gate. Reports retain
the actual installed pnpm graph separately from the tracked registry lock.

`spec-first` maps document parser and index sources to
[Documents](plugins/tasks/documents.md), projection, query, repository,
mutation, and file-store sources to [Runtime](plugins/tasks/runtime.md),
list-navigation and catalog-list attach sources to
[Lists](plugins/tasks/lists.md), and planner, view, workspace, and
`src/lib/tasks/**` sources to [Planner](plugins/tasks/planner.md). Leftover
package, manifest, plugin, and Storybook contract sources stay on
[Tasks](plugins/tasks/index.md).

The native recovery catalog family is classified as an application example in
`stories/catalog/story-parity.json`. It renders the public WorkspaceShell and
the production Tasks command/menu presentation; its declared native inspection
result is a fixture, while actual journal, reload and cold recovery acceptance
belongs to the hosted consumer. It grants no native writer authority.

Private native Tasks sources, tests, fixtures and Cargo manifests under
`crates/lapis-task-services` are protected by spec-first and map to
[Runtime](plugins/tasks/runtime.md). This crate is not published through npm or
Cargo. Its source acceptance uses locked native tests/build, strict Clippy and
formatting in addition to the retained TypeScript reference and normal package
lanes. Native parser acceptance does not establish host integration or default
ownership.

The shared `@lapismd/spec-validator` package is repository validation tooling,
not a runtime package. It MUST resolve from npm through the root development
dependency. This exception does not weaken source-first validation for runtime
Lapis, Design Core, or Mira dependencies.

Local development snapshots are disposable installation artifacts. After a
sibling package changes, `pnpm install --lockfile=false --force` refreshes those
snapshots through the existing hook without changing the registry lockfile.
Stop the package Storybook before refreshing and cold-start it afterward.
This is temporary local acceptance, not evidence of registry release readiness.

The unbatched browser acceptance lane can intermittently lose its Vitest
orchestrator connection between story files, reporting `Browser connection was
closed` and `rpc is closed, cannot call "createTesters"`. Serial execution,
Node 24, and Chromium's full headless channel did not resolve it. The root cause
remains open; a successful single run does not prove the transport is reliable.

For temporary complete acceptance, run `node scripts/test-storybook-batches.mjs`.
It runs all three Vitest shards sequentially with one worker and a fresh browser
process per shard, failing immediately on any failed batch. Vitest partitions
the complete discovered story file set; no story, assertion, accessibility gate,
or readiness budget is excluded or relaxed. `pnpm test:storybook` now selects
this bounded runner by default. Explicit selectors remain literal. Plays MUST
wait for visible dialogs, confirmed closure and pointer release before the next
interaction. Tooltip assertions MUST identify the active content rather than
retained closing content from an earlier trigger.

Diagnostic capture MUST retain at least 50 stack frames when supported and
restore the caller's stack-limit setting after each capture.

The preview MUST inherit sans and monospace families from Design Core's public
stylesheet, matching the main Lapis hosts. The real Tasks settings acceptance
MUST verify DM Sans plus Design Core's declared settings heading tokens
(16px, weight 700), following `DC-WS-069` rather than older catalog typography.

The temporary batch runner MUST apply its one-worker bound and disabled file
parallelism to the nested Storybook project through a batch-only configuration.
It MUST reuse the package's existing Vite/Storybook setup and leave the normal
unbatched configuration available for diagnosis.

Runtime-gap acceptance records exact before/after regression counts, exercises
the repository-backed Shell, and runs the complete interaction/axe suite through
the documented fresh-process batches. Temporary local package snapshots retain
registry ranges in publishable manifests; visual review remains pending.

Shell comment acceptance MUST verify the public Design Core chat transcript and
composer composition, stored timestamps, accessible comment actions, keyboard
posting, failed-post draft restoration, and Accordion disclosure/icon state
with draft retention through collapse. It MUST continue to exercise the
existing edit-failure retry, resolution, reopen, and deletion boundaries.

Inline Notes acceptance MUST verify the registered Markdown live-preview stack,
rendered formatting, and a body-only editable buffer in both agenda and List
rows. It MUST finish a successful guarded flush before isolating a subsequent
save failure, preserve the failed draft, and verify persistence on retry and
reopening. Accessibility acceptance MUST include the expanded live editor.
It MUST also verify full-width body geometry in agenda and List inline editors
with title-aligned body text and a visible folding rail to its left, no centered
document padding, a uniform expanded-row/editor background with card-matched
rounding and a transparent border without extra container padding, and
checklist labels beside their checkboxes in a rendered
Markdown List.

The shared demo MUST include a real Task document body with prose, headings,
formatting, and list content. `InlineEditorAlignment` MUST measure authored
paragraph text against the title in Today and List rows, keep folding controls
inside the row but before that text column, and retain the expanded editor for
accessibility acceptance.
It MUST also prove that both inactive Focus list markers have visible,
non-zero bullet paint rather than displaying raw Markdown dashes.

Planner action acceptance MUST visit all seven named destinations, keep page
menus inside the owning Column Canvas header before its trailing collapse
control, and prevent destination-specific actions from leaking to other pages.
Logbook acceptance MUST exercise every status filter against both completed and
canceled Tasks, verify the selected menu state, and cover standalone header
composition.

Lists heading acceptance MUST verify the New list icon's alignment with count
chips, preceding Edit navigation action, keyboard focus feedback, editable
authoritative Markdown source, and equivalent collapsed-popover controls.
Alternate-path and absent-document scenarios MUST seed their navigation
documents before metadata indexing in fresh Apps, preserving the default shared
workspace fixture. Changes to this boot fixture MUST run the complete Shell
interaction/accessibility suite, along with affected catalog stories.

Published Design Core resolves its own declared Bits UI range. Consumer
Storybook and test configuration MUST NOT force its internal components onto
the older consumer Bits UI installation; both declared versions are
pre-optimized for cold browser acceptance.

Cold browser acceptance pre-optimizes the shared `@internationalized/date`
entry point alongside both Bits UI installations, preserving calendar value
identity across consumer and Design Core surfaces.

The local package hook retains development host snapshots and has no Design
Core source mapping. Its mixed-manifest regression verifies that all requested
foundations retain npm ranges even when sibling checkouts exist.

## Docker validation and story composition

Portable commands and native bootstrap exceptions are governed by the registry
in `scripts/validation/lanes.json` and its fail-closed routing audit. The small
private runner retains the source-pack, checksum-qualified tool, archive and
report patterns used by Notes/Plugins, without importing sibling scripts or
creating a new public package API. Human workflow is in `docs/validation.md`.

Image identity follows the actual recipe and selected tools. Dependency locks
and verified archives select the pnpm cache; Cargo inputs and the Rust recipe
select a separate native cache. Unrelated script or UI dependency edits do not
discard compiled Rust artifacts. Active or unknown remote worker state retains
the checkout lease. Cleanup requires completion evidence and removes the
original lease container ID, never a successor that reused its name.
Workers use Docker init and drop Linux capabilities. The real smoke verifies
the denied-write boundary before starting Chromium, so root privileges cannot
turn permission regressions into false passes.

The explicit coverage inventory supports this repository's CSF-Svelte stories.
It distinguishes the real Tasks Shell from focused AppShell and Column Canvas
examples. The fixture helper isolates synthetic setup controls; it is not
production application UI. Source, interaction, accessibility and visual gates
remain distinct. No visual baseline is approved by this tooling.

Native lifecycle reference capture uses the explicit Docker-routed
`capture:native-lifecycle-reference` authoring command. It exports complete
retained repository results into collected `test-results/lifecycle.json`; the
ordinary `test:native-lifecycle-reference` lane compares frozen expected bytes
and never updates them. Capture alone does not qualify a native implementation.

## npm release operations

A source PR includes a public-package changeset. The main-source workflow runs
all Docker gates before opening the Changesets Version Packages PR. The version
command synchronizes `package.json`, `manifest.json`, the lockfile and the
canonical release-version declaration; it does not publish. After that PR passes
CI and merges, the workflow qualifies its exact source again, publishes the
checksummed tarball with provenance, downloads that same npm version and proves
strict-peer clean installation, frozen reinstall, signature verification and
publint before creating the package-scoped GitHub release. A green version PR
alone is not completed publication.

`changeset`, `release:version`, `release:attest`, `release:publish` and `release:verify` are reviewed
native release bootstrap commands. The publisher requires the approved main
workflow and exact candidate/source agreement. Preparation MUST reject temporary
archive installations; publishable candidates MUST record frozen registry-only
dependencies. `release:prepare` remains a
Docker lane and is the final step of `validation:all`. A failed publish or
registry check leaves the release incomplete and must be followed through;
retrying may reuse only an existing version with identical artifact integrity.
The protected main job MUST also retain an npm-compatible Sigstore provenance
bundle whose sole subject is the qualified tarball PURL and SHA512 digest, with
the exact workflow and source revision. Initial npm bootstrap MAY stage that
identical CI artifact with its verified provenance file; it MUST NOT repack or
resign another candidate. The npm credential belongs to the protected `npm-production` environment or the
configured trusted publisher. Signed plugin-registry onboarding and platform
application adoption remain separate acceptance work.

Registry browser qualification retains Vite `6.4.5` with the Svelte `5.1.1` Vite
plugin. The compiler MUST retain ownership of generated virtual CSS during
Storybook development, static builds and Vitest browser execution.

Detached provenance verification MUST pass the issuer and anchored workflow
identity through Sigstore 4.1.1's two-argument options overload and check the
returned signer identity. A real verifier regression MUST reject valid foreign
workflow provenance and a tampered payload before any bundle is retained.
The npm provenance predicate MUST include `internalParameters.github` with
the admitted event and exact numeric repository and owner ID strings. Signing
MUST reject foreign IDs and events outside main push or manual dispatch.
