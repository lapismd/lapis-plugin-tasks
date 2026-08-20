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

When navigation selects a task list, the middle column keeps its list title as
workspace chrome but replaces the bucket planner body with the complete
Markdown file surface. Its Tasks surface context preserves task selection,
detail opening, checklist interaction, completion, TaskRun quick-create,
drag ordering, title-click editing, and double-click inline task expansion
without allowing row controls to activate document editing or structural source.
Ordinary Markdown surfaces deliberately omit planner-only selection, creation,
and drag behavior. See LN-TASK-035 and LN-TASK-037.
The middle-column toolbar uses the Markdown pencil and book-open affordances to
enter and leave full-document live preview, so the same control remains
available at phone width without claiming document-body double-click. The
planner column also exposes the controller-owned collapse toggle. The TaskRun
block's code icon is the only pointer control that reveals its literal source.
It overlays the run's inline end beside the authored grouping heading instead
of consuming a standalone row. The preview, CodeMirror editor, scroller, and
gutters share the
active Lapis Markdown theme background and retain the Lapis document margins.
The rich widget resets CodeMirror whitespace and typography inheritance so its
task rows retain their normal compact layout and card surfaces without consuming
the next heading's boundary decoration. In ordinary Markdown surfaces, rich rows
remain inside the render width so neither end radius is clipped, and the
Tasks-owned checkbox tick is isolated from host Markdown checkbox selectors.
An H2-H6 that owns a rich run, or a lightweight checklist in a Task document,
keeps its Markdown semantics but adopts the Today category pill treatment in
reading mode and live preview. Qualifying headings rotate through neutral,
warning, info, accent, and success colours in source order. The decoration does
not apply in source mode and does not make the heading itself a planner control.
TaskRuns and the daily planner both render
`TaskQuickCreateRow` and `TaskQuickCreateActions`, rather than maintaining
separate add forms. Rich TaskRun rows reuse the planner's selection resolver and task-patch
helper: a row click selects, modifiers toggle or extend selection, the title
edits, a title/body double-click expands inline, and only the trailing details
control opens the detail column.
Linked task-list entries use the same row rhythm and selection surface, replacing
the task checkbox with a list icon. Tasks-owned surfaces expose their drag handle
on row hover or focus. They support recursive disclosure, within-run ordering,
explicit cross-run movement, delete, and a trailing open control. Open mounts the
linked list's complete Markdown surface in a bordered, rounded, closeable column
to the right without
replacing the parent list or forcing its active editor back to preview.
Child-task refreshes update those rows in place. The Markdown file surface is
keyed by its container and list path, so a task title, schedule, status, or
checklist mutation cannot remount CodeMirror or leave live preview. Structural
create, reorder, and delete operations transact through that active editor.
The real-App shell fixture keeps authored prose before and after an arbitrarily
named grouping heading and structural run, so desktop and phone acceptance
exercise source-order authority rather than a list-only special case.
The same shell fixture opens `lists.md` as ordinary Markdown and verifies that
its presentation-only pins reuse the List row without gaining structural or
planner behavior.

`tasks-workspace.svelte` wires a live `App` and `TaskRepository`: refresh
from `buildTaskPlannerSnapshotFromRepository`, persist through
`applyCatalogTaskToRepository`, and open list notes with `app.openFile`.
Catalog and Storybook fixtures may build a snapshot from in-memory `Task`
rows instead of a vault. Those fixtures must still round-trip through task
documents. See LN-TASK-021 and LN-TASK-022.

Opening task detail retains the task checkbox, editable title, metadata chips,
actions, and close control, but its body mounts the complete Task `TFile` rather
than a notes-only projection. The same pencil/book-open affordance toggles live
preview. A Task document may therefore render its own heading-aware TaskRuns and
lightweight checklists in source order.

In preview mode, the file surface hides its H1 only when the normalized heading
matches the surrounding Column Canvas title. Live edit keeps the H1 in the
source so the document remains complete and directly editable.

When a task row shows its list chip, it prefers the projected task-list page
title over the internal `listId`. A legacy row with only that id shows its
human-readable fallback (for example, `list-docs` becomes `List Docs`). See
LN-TASK-015.

`Plugins/Tasks/Shell` boots a public `App`, loads File Explorer, Search,
Markdown, and `TasksPlugin`, seeds planner Markdown, and restores a `tasks`
leaf. The live planner uses the same pinned clock as the repository
snapshot. The desktop and phone-width demos restore Today for their final
visual state and then collapse the Lapis left sidebar so the planner is the
resting focus.

The Today planner is a controlled selected-date surface. Its default date and
all completion timestamps come from the injected local clock. A Monday-first
seven-day strip selects the displayed date, with previous- and next-week
controls. The selected day and actual today have distinct states, and the strip
itself communicates the selected weekday and date without a redundant large
weekday/month banner. When they differ, the existing Column Canvas header-action
slot contains a Today shortcut; choosing a date or week never changes task files.
See LN-TASK-030.

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
Every header keeps its icon and title at the leading edge and groups the item
count with the disclosure chevron at the trailing edge, so counts align across
sections regardless of title length.
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
task gains a `task-entry` from that List.

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
a progress bar, completed/total count, and collapsed disclosure control without
putting item text into the planner snapshot. The checklist is the final child of
the whole task card after application and list chips. It spans beneath the
content and trailing controls, keeps both bottom corner radii, and therefore
reads as the card footer rather than another chip-column item. A top divider and
slightly darker semantic surface distinguish it without introducing a separate
card. The body and footer own separate interaction surfaces: body hover does not
recolor the footer, but its border frames the whole task card including that
footer; hover or focus within the footer applies its own subtle surface change.
The trailing details control is vertically centered with
the title line. A selected row carries its selection surface through the footer,
so a checklist does not visually interrupt the selected card. The checklist
footer owns the lower rounded corners; its body and opaque swipe surface keep
square lower corners, including on hover. Adjacent selected rows square the
corners at their shared edge, preventing selected color from leaking beside the
selection outline. Those row, body, and swipe surfaces share one hover duration,
while the nested preview only animates layout. Opening the disclosure lazily
reads the current `TaskDocument` through `TaskRepository`. Expanded items reuse
the public Tasks `ApplicationTaskCheckbox` rather than a separate native-checkbox
presentation.

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
