# Specification Governance

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
