# Verification

| ID | Status | Evidence |
| --- | --- | --- |
| LPT-SPEC-001 | Implemented | `pnpm spec:build` builds the standalone mdBook. |
| LPT-SPEC-002 | Implemented | `pnpm spec:first` maps protected changes to canonical chapters. |
| LPT-SPEC-003 | Implemented | `pnpm spec:validate` enforces unique definitions and one verification row per ID. |
| LPT-SPEC-004 | Implemented | Manifest validation rejects non-portable protocols. |
| LPT-SPEC-005 | Implemented | `pnpm-workspace.yaml` uses `link:` overrides; the package is the only workspace member. |
| LPT-SPEC-006 | Implemented | Package scripts and supervisor smoke checks cover stop, reuse, and restart on the checkout-owned 7030 lane. |
| LPT-SPEC-007 | Implemented | `AGENTS.md` defines App ownership and the required source audit. |
| LPT-SPEC-008 | Implemented | The repository taxonomy audit covers every story title under `Plugins/Tasks`. |
| LPT-SPEC-009 | Implemented | Exact Storybook mirror validation covers every SUMMARY chapter. |
| LPT-SPEC-010 | Implemented | Canonical plugin chapters and stories use the `Plugins/Tasks` hierarchy. |
| LN-TASK-001 | Implemented | Package identity, manifest, build, and pack inspection. |
| LN-TASK-002 | Implemented | Stub plugin source and unit checks confirm no view or command registration. |
| LN-TASK-003 | Implemented | Application-ownership audit excludes `globalThis.app`. |
| LN-TASK-004 | Implemented | Catalog sources import public Design Core primitives and native Tasks CSS. |
| LN-TASK-005 | Implemented | Package dependencies and source audit exclude forbidden legacy packages. |
| LN-TASK-006 | Implemented | Storybook Vitest accessibility annotations fail axe violations; stories stay `visual-pending`. |
| LN-TASK-007 | Implemented | No desktop or web host registration is present in this repository. |
| LN-TASK-008 | Implemented | Public `src/lib/index.ts` exports the plugin and catalog components without `TaskDueCalendar`. |
| LN-TASK-009 | Implemented | Catalog Autodocs stories set `parameters.docs.source` to public package imports. |
| LN-TASK-010 | Planned | Vault files, views, commands, and panels remain unspecified. |
| LN-TASK-011 | Implemented | CV-only fields live in `src/lib/model` fixtures. |
| LN-TASK-012 | Implemented | `Plugins/Tasks/Panels` Column Canvas story fills the viewport without page scroll, uses the App Shell sidebar surface, and blends the leading Tasks column. |
