# Specification Governance

## Requirements

| ID | Requirement |
| --- | --- |
| LPT-SPEC-001 | `spec/src` MUST remain the canonical standalone specification and MUST build with mdBook. |
| LPT-SPEC-002 | Protected package, manifest, source, Storybook, validation, and CI changes MUST update an owning canonical chapter in the same Jujutsu change. Host plugin-class registration is specified in LN-TASK-007 and does not move governance ownership. |
| LPT-SPEC-003 | Every normative requirement ID MUST be unique and MUST have exactly one verification row with concrete evidence. |
| LPT-SPEC-004 | Published package manifests MUST use portable semver ranges and MUST NOT contain `workspace:`, `link:`, `file:`, or machine-specific dependency paths. Registry packages such as `yaml` MAY be added when the Markdown-first task model needs them. Recurrence execution MUST pin `rrule` exactly at `2.8.1` so library behavior cannot drift independently from its RFC compatibility tests. |
| LPT-SPEC-005 | Colocated siblings MUST resolve through `link:`-valued workspace-level overrides. Siblings MUST NOT become workspace members or mutate sibling `node_modules`. Workspace overrides MUST pin the CodeMirror and Lezer packages used by Storybook shell hosts. |
| LPT-SPEC-006 | Package Storybook MUST expose checkout-owned `storybook`, `storybook:stop`, and `storybook:restart` commands. They MUST default to port 7030, honour `.env.storybook.local`, reuse one supervisor per checkout, and refuse to replace a listener owned by another checkout. |
| LPT-SPEC-007 | Tracked agent guidance MUST require explicit or context-owned App access, restrict `globalThis.app`, and require the package ownership audit for App-related changes. |
| LPT-SPEC-008 | Repository validation MUST reject story titles outside the `Plugins/Tasks/*` taxonomy. |
| LPT-SPEC-009 | Repository validation MUST compare every SUMMARY chapter with an exact metadata-only Storybook mirror and MUST keep those mirrors as Storybook's first section in SUMMARY order. |
| LPT-SPEC-011 | Tracked agent guidance MUST require preserving unrelated work, committing every independently verified change with Jujutsu without waiting for another request, and using a PR-quality message that explains what changed, why it changed, and which validation passed. |

`spec-first` maps document parser and index sources to
[Documents](plugins/tasks/documents.md), projection, query, repository,
mutation, and file-store sources to [Runtime](plugins/tasks/runtime.md),
list-navigation and catalog-list attach sources to
[Lists](plugins/tasks/lists.md), and planner, view, workspace, and
`src/lib/tasks/**` sources to [Planner](plugins/tasks/planner.md). Leftover
package, manifest, plugin, and Storybook contract sources stay on
[Tasks](plugins/tasks/index.md).
