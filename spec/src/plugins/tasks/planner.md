# Planner

The planner is a main-area view, not a host movable-panel runtime. Host
movable panels remain unspecified. See LN-TASK-010 and LN-TASK-012.

`TasksView` in `src/lib/tasks-view.ts` fills a `tasks` leaf with the same
Column Canvas composition as the `Plugins/Tasks/Panels` catalog story:
navigation, planner body, and closeable task detail. Additional closeable
columns may open from the selected task in catalog stories.

## Composition

`TasksPlannerCanvas` in
`src/lib/tasks/application-task-planner-mode/TasksPlannerCanvas.svelte`
hosts the lanes. The first column is buckets plus the Lists tree from
[Lists](./lists.md). The middle column is
`ApplicationTaskPlannerMode`. The third column is task detail.

`tasks-workspace.svelte` wires a live `App` and `TaskRepository`: refresh
from `buildTaskPlannerSnapshotFromRepository`, persist through
`applyCatalogTaskToRepository`, and open list notes with `app.openFile`.
Catalog and Storybook fixtures may build a snapshot from in-memory `Task`
rows instead of a vault. Those fixtures must still round-trip through task
documents. See LN-TASK-021 and LN-TASK-022.

`Plugins/Tasks/Shell` boots a public `App`, loads File Explorer, Search,
Markdown, and `TasksPlugin`, seeds planner Markdown, and restores a `tasks`
leaf. The live planner uses the same pinned clock as the repository
snapshot.

## Bucket classification

Named query views live in `matchesTaskView`. The planner body uses
`classifyTask` in `src/lib/model/planner.ts` to place a catalog `Task` into
one bucket. Neither path writes `today` or `upcoming` into YAML.
See LN-TASK-018.

| Bucket | `classifyTask` rule |
| --- | --- |
| Logbook | Task is completed |
| Inbox | `inbox` is true |
| Someday | `start` or `when` is `someday` |
| Review | Plan date is before today |
| Today | Plan or deadline is today or earlier, including this-evening |
| Upcoming | Start date, plan date, or deadline is after today |
| Anytime | Remaining open tasks with an actionable start and no future date |

Upcoming day rows place open tasks by plan date, or by deadline when plan is
omitted. A deadline-only task is not undated Anytime. Overdue `plan.date`
stays visible in Review until the user reschedules, completes, skips, or
cancels.

## Drag hosts

The first Column Canvas column uses the same planner drop-host attributes as
the App Shell sidebar: `data-planner-drop-id`, `data-planner-drop-data`, and
`data-planner-drop-mode`. Dragging a task over a bucket or list morphs the
drag preview and highlights the drop target. See LN-TASK-028.

`plannerDropTargetFromPoint` in
`src/lib/tasks/lib/application-task-planner-mode-helpers.ts` accepts both
`planner-sidebar-bucket` and `planner-sidebar-list` payloads.
`ApplicationTaskPlannerMode` then calls `saveTaskPatch`: a bucket drop
updates plan, inbox, or start; a list drop sets `listId` and `areas` so the
task gains a `list-item` on that list.

## Branding versus catalog

Canonical planner types use the Markdown-first schema. CV-only
`applicationId` and `JobApplication` shapes stay in catalog fixtures and
must not become document types. See LN-TASK-011.
