# Verification

| ID | Status | Evidence |
| --- | --- | --- |
| LPT-SPEC-001 | Implemented | `pnpm spec:build` builds the standalone mdBook. |
| LPT-SPEC-002 | Implemented | `pnpm spec:first` maps protected changes to canonical chapters. |
| LPT-SPEC-003 | Implemented | `pnpm spec:validate` enforces unique definitions and one verification row per ID. |
| LPT-SPEC-004 | Implemented | Manifest validation rejects non-portable protocols. |
| LPT-SPEC-005 | Implemented | `pnpm-workspace.yaml` uses `link:` overrides and pins CodeMirror and Lezer; the package is the only workspace member. |
| LPT-SPEC-006 | Implemented | Package scripts and supervisor smoke checks cover stop, reuse, and restart on the checkout-owned 7030 lane. |
| LPT-SPEC-007 | Implemented | `AGENTS.md` defines App ownership and the required source audit. |
| LPT-SPEC-008 | Implemented | The repository taxonomy audit covers every story title under `Plugins/Tasks`. |
| LPT-SPEC-009 | Implemented | Exact Storybook mirror validation covers every SUMMARY chapter. |
| LPT-SPEC-010 | Implemented | Canonical plugin chapters and stories use the `Plugins/Tasks` hierarchy. |
| LN-TASK-001 | Implemented | Package identity, manifest, build, and pack inspection. |
| LN-TASK-002 | Implemented | Plugin onload registers the tasks projection, `tasks` view, `tasks:open`, and ribbon. |
| LN-TASK-003 | Implemented | Application-ownership audit excludes `globalThis.app`. |
| LN-TASK-004 | Implemented | Catalog sources import public Design Core primitives and native Tasks CSS. |
| LN-TASK-005 | Implemented | Published runtime excludes forbidden packages; Storybook may depend on workspace hosts and pins one CodeMirror copy. |
| LN-TASK-006 | Implemented | Storybook Vitest accessibility annotations fail axe violations; stories stay `visual-pending`. |
| LN-TASK-007 | Implemented | Hosts register TasksPlugin only; views come from plugin onload. |
| LN-TASK-008 | Implemented | Public `src/lib/index.ts` exports the plugin, view type, and catalog components without `TaskDueCalendar`. |
| LN-TASK-009 | Implemented | Catalog Autodocs stories set `parameters.docs.source` to public package imports. |
| LN-TASK-010 | Implemented | `TasksView` mounts the Column Canvas planner in a main-area `tasks` leaf. |
| LN-TASK-011 | Implemented | CV-only fields live in `src/lib/model` fixtures. |
| LN-TASK-012 | Implemented | `Plugins/Tasks/Panels` Column Canvas story fills the viewport without page scroll, blends the leading Tasks column without a bottom border, squares the sticky Tasks overlay, keeps the planner start corners complete, curves the Tasks resize handle around those corners, sizes Tasks to its labels and counts, aligns the Tasks and planner headers, keeps visible Tasks hover and selected states, mounts detail without a wrapper, and flushes the Tasks resize handle to the planner start border. |
| LN-TASK-013 | Implemented | `ApplicationTaskAreaPicker` composes Command View as the list picker; Area Picker Sample areas play asserts the command-view host. |
| LN-TASK-014 | Implemented | `parseTaskDocument` requires `type: task` and `id`; title comes from the first H1. |
| LN-TASK-015 | Implemented | `parseTaskDocument` accepts `type: task-list` with `list.status` active or archived. |
| LN-TASK-016 | Implemented | Task front matter maps nested `task:` status, start, inbox, plan, deadline, and repeat; view flags are not stored. |
| LN-TASK-017 | Implemented | Reserved-section parser indexes Checklist checkboxes and Subtasks/Items links without checkbox wrappers. |
| LN-TASK-018 | Implemented | `task-queries` derives Inbox, Today, Anytime, Upcoming, Someday, Completed, and Review without rewriting plan dates. Planner fixtures assert deadline-only tasks appear on Upcoming day rows. |
| LN-TASK-019 | Implemented | Mutations rewrite one document then project; rolling complete resets only `## Checklist`. |
| LN-TASK-020 | Implemented | `TaskRepository` queries AppDatabase projections; planner fixtures assert the same view ids as catalog summaries. |
| LN-TASK-021 | Implemented | Planner Markdown fixtures round-trip through `parseTaskDocument`; list membership comes from task-list `## Items`. |
| LN-TASK-022 | Implemented | `Plugins/Tasks/Shell` boots WorkspaceShell with File Explorer, Search, Markdown, and TasksPlugin against planner Markdown fixtures, pins the planner clock, fills the canvas viewport, and keeps docs embeds at 700px. |
| LN-TASK-023 | Implemented | Parser accepts `type: task-list-navigation`; planner fixtures seed vault-root `lists.md`; extra navigation documents are ignored. |
| LN-TASK-024 | Implemented | Index emits `navigation-item` edges that `parent()` ignores. Repository list-parent queries use incoming `list-item` only and refuse cycles or a second structural parent. |
| LN-TASK-025 | Implemented | Planner snapshot builds a sectioned list tree; sidebar renders expandable section folders, nested lists, and All lists; opening a list still filters tasks by that list. |
| LN-TASK-026 | Implemented | Navigation and `## Items` rewrites cover pin reorder, restack, nest, unnest, and rename. `createList` writes a new list file; area-picker create uses it. Creating a task in Applications with area `list-applications` attaches to that list and does not mint `list-list-applications`. |
| LN-TASK-027 | Implemented | TaskListNavTree uses Explorer guide tokens, nested sublists, inline rename, and HTML5 drag with auto-expand. |
| LN-TASK-028 | Implemented | Column Canvas first-column buckets and list rows carry planner drop-host attributes; dragging a task over Inbox morphs the App Shell drag preview. |
