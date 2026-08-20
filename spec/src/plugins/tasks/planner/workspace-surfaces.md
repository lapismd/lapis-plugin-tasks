# Planner workspace surfaces

The Tasks workspace uses Design Core Column Canvas to keep navigation, the
active planner or document, and contextual details in one horizontally
composable surface. This chapter describes that composition and the ownership
rules for its Markdown editors.

See LN-TASK-012, LN-TASK-022, LN-TASK-035, and LN-TASK-037.

## Column composition

`TasksView` in `src/lib/tasks-view.ts` fills a `tasks` leaf with
`TasksPlannerCanvas`. The canvas contains:

1. a leading Tasks column with named views and the List tree;
2. a middle planner column containing `ApplicationTaskPlannerMode` or the
   selected document surface;
3. an optional closeable Task detail or linked-List column.

The planner column exposes its controller-owned collapse action. A linked List
opens to the right without replacing its parent and uses the same bordered,
rounded column treatment as the planner body.

The first-column resize handle centers its transparent pointer target across
the planner start border. The adjacent planner surface paints and clips the
hover accent inside its rounded start corners, so the visual handle complements
the right-side handle while the larger hit target remains easy to acquire.

## Complete Markdown file surfaces

Selecting a Task List replaces only the middle-column body with that List's
real `TFile`. The Column Canvas title remains workspace chrome while the
complete Markdown document keeps its authored headings, prose, TaskRuns, and
ordering. Opening Task detail retains task metadata and actions above the
complete Task file surface.

Preview hides the first H1 only when its normalized text matches the surrounding
column title. Live edit retains the H1 source. The pencil and book-open toolbar
actions enter and leave full-document live preview; document-body double-click
is reserved for the content's normal interactions. Leaving edit mode flushes
before returning to preview. A failed save keeps the dirty editor active, and
external metadata refreshes cannot replace an unsaved buffer.

The preview, CodeMirror editor, scroller, and gutters use the active Lapis
Markdown theme background and document margins. Preview uses the planner's
outer vertical scroll. Live edit gives CodeMirror the active vertical scroll so
two nested scrollers do not compete.

If the public Markdown file-surface provider is unavailable, Tasks falls back
to the host read-only Markdown renderer and retains an Open note action.

## Surface context and mutations

The Tasks-owned surface supplies an opaque planner controller through the
public Markdown surface context. That context enables selection, detail
opening, TaskRun quick-create, drag ordering, completion, and checklist
interaction. Ordinary Markdown reading, embed, and live-preview surfaces use
the shared rich rendering without planner-only creation, deletion, or drag
behavior.

Structural edits made while the List document is live-edited dispatch
CodeMirror transactions and use the editor's serialized save. Read-only
structural edits reread the document and use guarded repository ranges. Linked
Task changes always update the child Task through `TaskRepository`, followed by
projection refresh.

The Markdown file surface is keyed by its container and file path. Refreshing a
child title, schedule, status, or checklist therefore updates rows in place
without remounting CodeMirror or abandoning live preview.

## Storybook shell acceptance

`Plugins/Tasks/Shell` boots a public `App`, loads File Explorer, Search,
Markdown, and `TasksPlugin`, seeds real planner Markdown, and restores a
`tasks` leaf. The fixture includes prose before and after arbitrarily named
grouping headings so it exercises source-order authority rather than a
list-only special case. It also opens `lists.md` as ordinary Markdown to verify
that navigation pins reuse List-row presentation without gaining structural
behavior.

Desktop and phone-width stories use the same pinned clock as the repository
snapshot. Their final state returns to Today and collapses the Lapis left
sidebar so the current Tasks surface is the visual focus.
