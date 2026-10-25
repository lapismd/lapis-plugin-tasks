# Specification Governance

Dependency acceptance now uses published Design Core `0.3.1` and Mira `0.0.3` through portable npm ranges. Source ownership and public contracts remain
unchanged; local overrides for these released packages are retired.
Shared specification tooling resolves `@lapismd/spec-validator@0.1.4` from npm.

## Requirements

| ID           | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LPT-SPEC-001 | `spec/src` MUST remain the canonical standalone specification and MUST build with mdBook.                                                                                                                                                                                                                                                                                                                                                                                                     |
| LPT-SPEC-002 | Protected package, manifest, source, Storybook, validation, and CI changes MUST update an owning canonical chapter in the same Jujutsu change. Host plugin-class registration is specified in LN-TASK-007 and does not move governance ownership.                                                                                                                                                                                                                                             |
| LPT-SPEC-003 | Every normative requirement ID MUST be unique and MUST have exactly one verification row with concrete evidence.                                                                                                                                                                                                                                                                                                                                                                              |
| LPT-SPEC-004 | Published package manifests MUST use portable semver ranges and MUST NOT contain `workspace:`, `link:`, `file:`, or machine-specific dependency paths. Registry packages such as `yaml` MAY be added when the Markdown-first task model needs them. Recurrence execution MUST pin `rrule` exactly at `2.8.1` so library behavior cannot drift independently from its RFC compatibility tests.                                                                                                 |
| LPT-SPEC-005 | Published LapisMD dependencies MUST resolve through npm semver ranges. Local package source or artifacts MAY replace matching install dependencies through `.pnpmfile.cjs` only when those paths exist; absent local paths and CI MUST retain registry resolution. External repositories MUST NOT become workspace members or mutate dependency `node_modules`. Workspace overrides MUST pin the CodeMirror and Lezer packages used by Storybook shell hosts.                                 |
| LPT-SPEC-006 | Package Storybook MUST expose checkout-owned `storybook`, `storybook:stop`, and `storybook:restart` commands. They MUST default to port 7030, honour `.env.storybook.local`, reuse one supervisor per checkout, refuse to replace a listener owned by another checkout, apply exactly one Svelte transform pipeline to package and linked-source modules in both the dev server and browser-test project, and synchronously apply the selected preview theme before story play functions run. |
| LPT-SPEC-007 | Tracked agent guidance MUST require explicit or context-owned App access, restrict `globalThis.app`, and require the package ownership audit for App-related changes.                                                                                                                                                                                                                                                                                                                         |
| LPT-SPEC-008 | Repository validation MUST reject story titles outside the `Plugins/Tasks/*` taxonomy.                                                                                                                                                                                                                                                                                                                                                                                                        |
| LPT-SPEC-009 | Repository validation MUST compare every SUMMARY chapter with an exact metadata-only Storybook mirror and MUST keep those mirrors as Storybook's first section in SUMMARY order.                                                                                                                                                                                                                                                                                                              |
| LPT-SPEC-011 | Tracked agent guidance MUST require preserving unrelated work, committing every independently verified change with Jujutsu without waiting for another request, and using a PR-quality message that explains what changed, why it changed, and which validation passed.                                                                                                                                                                                                                       |

`spec-first` maps document parser and index sources to
[Documents](plugins/tasks/documents.md), projection, query, repository,
mutation, and file-store sources to [Runtime](plugins/tasks/runtime.md),
list-navigation and catalog-list attach sources to
[Lists](plugins/tasks/lists.md), and planner, view, workspace, and
`src/lib/tasks/**` sources to [Planner](plugins/tasks/planner.md). Leftover
package, manifest, plugin, and Storybook contract sources stay on
[Tasks](plugins/tasks/index.md).

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
or readiness budget is excluded or relaxed. `pnpm test:storybook` remains the
original unbatched diagnostic lane.

The preview MUST inherit sans and monospace families from Design Core's public
stylesheet, matching the main Lapis hosts. The real Tasks settings acceptance
MUST verify DM Sans plus the shared compact heading tokens (16px, weight 400).

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
