# Specification Governance

## Requirements

| ID | Requirement |
| --- | --- |
| LPT-SPEC-001 | `spec/src` MUST remain the canonical standalone specification and MUST build with mdBook. |
| LPT-SPEC-002 | Protected package, manifest, source, Storybook, validation, and CI changes MUST update an owning canonical chapter in the same Jujutsu change. |
| LPT-SPEC-003 | Every normative requirement ID MUST be unique and MUST have exactly one verification row with concrete evidence. |
| LPT-SPEC-004 | Published package manifests MUST use portable semver ranges and MUST NOT contain `workspace:`, `link:`, `file:`, or machine-specific dependency paths. |
| LPT-SPEC-005 | Colocated siblings MUST resolve through `link:`-valued workspace-level overrides. Siblings MUST NOT become workspace members or mutate sibling `node_modules`. |
| LPT-SPEC-006 | Package Storybook MUST expose checkout-owned `storybook`, `storybook:stop`, and `storybook:restart` commands. They MUST default to port 7030, honour `.env.storybook.local`, reuse one supervisor per checkout, and refuse to replace a listener owned by another checkout. |
| LPT-SPEC-007 | Tracked agent guidance MUST require explicit or context-owned App access, restrict `globalThis.app`, and require the package ownership audit for App-related changes. |
| LPT-SPEC-008 | Repository validation MUST reject story titles outside the `Plugins/Tasks/*` taxonomy. |
| LPT-SPEC-009 | Repository validation MUST compare every SUMMARY chapter with an exact metadata-only Storybook mirror. |
