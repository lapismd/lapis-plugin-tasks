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

The Today planner is a controlled selected-date surface. Its default date and
all completion timestamps come from the injected local clock. A Monday-first
seven-day strip selects the displayed date, with previous- and next-week
controls. The selected day and actual today have distinct states. When they
differ, the existing Column Canvas header-action slot contains a Today shortcut;
choosing a date or week never changes task files. See LN-TASK-030.

## Bucket classification

Named query views live in `matchesTaskView`. The planner body uses
`classifyTask` in `src/lib/model/planner.ts` to place a catalog `Task` into
one bucket. Neither path writes `today` or `upcoming` into YAML.
See LN-TASK-018.

| Bucket | `classifyTask` rule |
| --- | --- |
| Logbook | Task is completed or canceled |
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

`plan.at` is a label within that day, not a separate query view. `anytime`
has no preferred window. `morning`, `afternoon`, and `evening` are loose
windows. `HH:mm` is time-blocked. The selected agenda includes every open task
whose plan date or deadline is on or before the selected date. This does not
consume or clear the separate Review view: an overdue plan can appear in the
selected daily agenda and remain eligible for Review until it is handled.

## Daily agenda sections

The selected date always renders these sections in this order:

| Section | Routing rule | Default disclosure | Color role |
| --- | --- | --- | --- |
| Anytime | `plan.at: anytime`, absent, or invalid | Expanded | Neutral |
| Morning | Explicit `morning`, or a clock before `afternoonStartsAt` | Expanded | Warning |
| Afternoon | Explicit `afternoon`, or a clock from `afternoonStartsAt` until `eveningStartsAt` | Expanded | Info |
| Evening | Explicit `evening`, legacy `when: this-evening`, or a clock from `eveningStartsAt` | Expanded | Accent |
| Done | Completed on the selected date | Collapsed | Success |

Explicit day parts do not depend on settings. The default clock boundaries are
`12:00` and `17:00`; both belong to the section they start. Missing or malformed
stored settings migrate to those defaults. Invalid task clock values remain
readable and route to Anytime. Canceled tasks do not enter Done. Section colors
use Tasks tokens derived from semantic roles rather than product-specific
hard-coded colors. Disclosure state is session-only, survives selected-date
changes, and leaves even collapsed or empty sections as sortable drop targets.
See LN-TASK-029 and LN-TASK-031.

When is the date or undated-bucket picker: Today, Tomorrow, a calendar date,
Anytime, or Someday. It does not offer morning, afternoon, or evening. Those
day-parts live on the `At` dropdown. Changing the date keeps the current
`plan.at`. Anytime and Someday clear the date and day-part.

`At` writes `plan.at` as `morning`, `afternoon`, `evening`, or `anytime`.
Evening may retain catalog compatibility `when: this-evening`, but section
routing is owned by the canonical `plan.at`. A clock value stays visible until
the user picks a day-part.

Planner status pickers use YAML `task.status`: Open, Completed, and Canceled.
The row checkbox still toggles open and completed. Canceled leaves Today and
appears in Logbook. Todo, Waiting, and Done are not planner status values.

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

Within the daily agenda, quick-create writes the selected date and the open
section's day part. Sortable layouts include all five sections even when they
are empty or collapsed. Cross-section drops persist both ordering and
placement. Done completes with the injected clock. Moving a completed row back
to an open section clears completion, writes the selected date, and assigns that
section's `plan.at`. Because Done groups by actual completion date, completing
while viewing another date can remove the row. Rolling recurring completion
continues to advance the task rather than adding an artificial history row.
See LN-TASK-032.

## Checklist progress

Catalog task rows use projected checklist aggregates for their collapsed
footer. Rows with no checklist do not render that footer. A nonzero total shows
a progress bar, completed/total count, and disclosure control without putting
item text into the planner snapshot. Opening the disclosure lazily reads the
current `TaskDocument` through `TaskRepository`.

Expanded checkboxes optimistically update progress while the guarded Markdown
mutation runs. Success replaces the local items with the reparsed document and
refreshes the planner projection. Failure restores the prior state, reloads the
current checklist, and presents the repository error inline. The disclosure and
checkboxes own their pointer and keyboard interaction: they do not select,
open, or start dragging the containing row. An aggregate revision received
after an external metadata refresh reloads an already-open checklist. See
LN-TASK-033.

## Branding versus catalog

Canonical planner types use the Markdown-first schema. CV-only
`applicationId` and `JobApplication` shapes stay in catalog fixtures and
must not become document types. See LN-TASK-011.
