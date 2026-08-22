# Planner workspace surfaces

The Tasks workspace uses Design Core Column Canvas to keep navigation, the
active planner or document, and contextual details in one horizontally
composable surface. This chapter describes that composition and the ownership
rules for its Markdown editors.

See LN-TASK-012, LN-TASK-022, LN-TASK-035, LN-TASK-037, LN-TASK-047, and
LN-TASK-056.

## Column composition

`TasksView` in `src/lib/tasks-view.ts` fills a `tasks` leaf with
`TasksPlannerCanvas`. The canvas contains:

1. a leading Tasks column with named views and the List tree;
2. a middle planner column containing `ApplicationTaskPlannerMode` or the
   selected document surface;
3. a closeable stack of Task detail and linked-List columns, one per opened
   descendant.

The Tasks column is collapsible and closeable. The first control in the Planner
header explicitly targets Tasks, while Planner's own controller-owned collapse
action remains farthest right. A linked List
or Task opened from any document appends immediately to that document's right
without replacing its parent. Each entry retains its own selection and editor
state and uses the same bordered, rounded column treatment as the planner body.
Choosing a different child from an ancestor truncates only the descendant
branch to its right. Closing a column performs the same branch unwind while
leaving every ancestor intact.

In desktop adaptive mode, the Tasks navigation keeps a finite maximum width.
Planner, Detail, and Related declare `maxWidth: null`, so the active adjacent
pair can use the complete visible stage. Design Core owns the paired allocator,
shared divider, inverse resize, collapse-time stretching, and per-pair split
restoration; Tasks does not calculate or persist widths itself. Navigating
deeper changes the active pair from Tasks/Planner to Planner/Detail and then
through each adjacent pair in the dynamic detail stack without discarding an
earlier split. Starting a pointer, keyboard, or reset interaction on an earlier
eligible divider reactivates that adjacent expanded pair without moving the
canvas, and decreasing its left column increases the right column by the same
amount. Compact/mobile mode keeps one full-width active column and exposes no
shared divider.

Collapsed columns are rails rather than pair members. Their widths and the
spacing around them remain deducted while Design Core pairs the next expanded
column. After structural navigation activates a pair, ordinary horizontal
scrolling moves through the existing canvas without changing widths, selecting
a different pair, or realigning the viewport. When Tasks becomes a sticky rail,
its complete outer slot remains ahead of the active content pair so the overlay
does not obstruct the leading column.

Tasks supplies a consumer-owned collapsed rail rather than Column Canvas's
fallback vertical title. It contains an expand action, the seven existing
planner glyphs with task-count Tooltips, and a Lists glyph with a List-count
Tooltip. The Lists glyph composes the shadcn Tooltip and Popover triggers and
opens the complete editable `TaskListNavTree` in an approximately 20rem,
collision-aware surface with its own vertical scroll. Disclosure, rename,
context-menu actions, and List rearrangement keep that surface open; selecting
a List closes it without expanding the column. The rail and hidden state omit
all planner task-drop metadata.

Wide and fixed canvases may temporarily render the ordinary expanded Tasks
body as a full-height overlay above adjacent columns. A thin neutral-grey,
zero-width boundary anchor previews immediately on edge hover or focus; the
Planner-header target previews after 600ms and both paths dismiss after a 120ms
grace period. Pointer or focus movement into the overlay, including owned
portalled controls, retains it. The overlay paints the sidebar surface rather
than inheriting transparency from the inline Tasks column. Clicking either
trigger makes the durable transition, while selecting inside a preview changes
navigation and dismisses the overlay without changing the saved
collapsed/hidden state. Compact mode disables these hover overlays and relies
on the adjacent click control to recover hidden navigation.

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

Lightweight checklist items inside the complete Task or List file surface stay
owned by the host Markdown provider. In writable preview, the checkbox supplies
an exact source range, the provider applies it to the current buffer, and the
complete document passes through the same serialized writer as live-preview
editing. This path preserves surrounding Markdown and never invokes Tasks'
ordinal checklist mutation; that guarded repository operation is reserved for
projected checklist controls such as the task-row footer.

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

The focused Deep Navigation Flow keeps the full
List → Task → List → Task → Task descendant chain mounted as five distinct
detail columns, checks the deepest pair, and then verifies that the earlier
Planner/Detail divider activates and resizes those columns inversely without
moving the native horizontal position.
