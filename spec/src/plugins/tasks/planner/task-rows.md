# Planner Task rows and checklists

Task rows are shared across the daily planner and rich Markdown TaskRuns. The
same presentation owns selection, title editing, detail opening, drag affordance,
metadata chips, and lazy checklist progress so those interactions do not drift
between surfaces.

See LN-TASK-033, LN-TASK-035, and LN-TASK-041.

## Task row interaction

On the Today agenda, a carried-over row whose plan or deadline made it eligible
before the selected date shows a prominent overdue icon immediately before the
task-details control. The indicator and details control share the title-line
vertical center. A task with an exact selected-date plan or deadline is not
marked overdue, even when another date field is older.

A row click selects the Task. Modifier clicks toggle or extend selection. The
title enters inline title editing, and a title or body double-click opens the
expanded inline editor. Only the trailing detail control opens Task detail.
The detail control, checkbox, title line, and leading hover/focus drag handle
share one vertical center.

## Structured metadata editor

The expanded row editor and Task detail use the same field definitions. Their
controls update the active Task value immediately and send one complete patch
through the owning callback. Canonical runtime adapters then route the changed
fields through `TaskRepository`, so the Markdown file is edited, reparsed, and
reprojected instead of leaving the interaction as catalog-only state.

The canonical controls are:

| Control | Task effect |
| --- | --- |
| Status | Opens, completes, or cancels the Task and maintains completion time |
| Deadline | Sets or clears `task.deadline` |
| Plan date | Sets or clears `task.plan.date` |
| Plan time | Sets `task.plan.at` to a day part or valid local `HH:mm` value |
| List | Moves the structural Task link to the selected Task List |
| Repeat | Sets or clears the complete rolling `task.repeat` object |

Priority is retained only by catalog compatibility adapters. Changing it may
update an `ApplicationTask`, but it does not create a priority field in the
canonical Task document.

Plan time uses a Command View popover with the four day parts, common `09:00`,
`12:00`, and `17:00` shortcuts, and a Design Core Time Picker for an exact
clock value. Day parts and shortcuts each form a two-column grid. Their group
headings and the Custom time title use a smaller, de-emphasized type scale so
the selectable values remain the visual focus. The List control uses the
standard Command View presentation without Tasks-owned panel heading chrome.
Known list options show the display title first, then the wrapped source
Markdown path in smaller supporting text. When the list navigation index
annotates the list under a section or parent list, the option also shows that
trail with the shared Design Core Breadcrumb component.
See LN-TASK-013 and LN-TASK-045–046.

When present, the lower metadata row starts with compact oval controls for a
Task's planned schedule and recurrence, then application and List chips. The
schedule and recurrence controls reuse the same picker components as the
expanded inline editor but use a visible chip surface suitable for the collapsed
row. Planned schedule chips use the row's injected local clock: only overdue
planned dates use destructive red treatment, and those overdue chips show the
relative `N days ago` label with a tooltip containing the full planned date. Day
part labels such as Morning, Afternoon, and Evening include their day-part icon
immediately before the text. Deadline keeps its existing title-row due indicator
styling; moving the planned date into the metadata row must not move or restyle
that deadline indicator. The List chip uses the projected Task List display
title. The display title prefers front matter `title`, then the first H1, then a
humanized stable id such as `List Docs` for `list-docs`.

Rich Markdown widgets reset inherited whitespace so rows keep the same compact
rhythm and card background as planner rows, but the wrapper must not overwrite
row-owned typography. Task title buttons keep the planner row semibold weight in
reading and live preview, and expanded quick-create inputs keep their medium
input weight. Ordinary Markdown surfaces keep the card within render width,
preserve both end radii, and isolate the Tasks checkbox tick from host Markdown
checkbox selectors.

## Checklist footer

Task summaries contain only checklist total and completed counts. Item text is
loaded from the Task document only when the footer is expanded.

A Task with at least one checklist item ends with a full-width footer after all
metadata chips. The footer has a top divider, a slightly darker semantic
surface, a compact progress bar, completed/total count, and an independent
disclosure that defaults collapsed. It owns both lower card radii while the
body above it keeps square lower corners.

The body and footer have independent hover surfaces, but the body hover border
frames the entire card. Selection color continues through the footer. Adjacent
selected rows square their shared corners so selection color does not leak at
the edges. Row, body, and swipe surfaces use the same hover timing.

Expanded items reuse `ApplicationTaskCheckbox`. Checking an item updates the
count optimistically, then asks `TaskRepository` to match the derived ordinal
and expected text and replace only that Markdown marker. A stale mismatch
leaves the file unchanged, reloads the checklist, and reports an inline error.
Other failures roll back the optimistic state. Footer controls stop row
selection, detail opening, and dragging.

## Rich TaskRuns and grouping headings

Reading mode, embeds, and live preview replace resolved structural runs with
the shared Task/List block. Source mode always shows the authored Markdown.
Live preview exposes one code-icon source control at the trailing edge of its
grouping-heading pill; reading mode and embeds omit it. Clicking the block body
never reveals source.

Task rows inside the shared block use the same title typography as the daily
planner row in both reading preview and live preview. Host Markdown and
CodeMirror styles must not change the task title's workspace sans family, size,
normal style, semibold weight, or line height.

An H2-H6 that owns a resolved TaskRun—or a lightweight checklist in a Task
document—keeps its Markdown semantics and adopts the Today section's category
typography and pill treatment. Qualifying headings rotate through neutral,
warning, info, accent, and success roles in source order. H1, implicit-root
entries, source-mode headings, and headings without Tasks content retain normal
Markdown presentation.

In live preview, the fold affordance sits immediately outside the pill's start
border. The heading label, source markers, and source control stay vertically
centered rather than inheriting CodeMirror's line alignment.

## Nested List rows

A structural link to `type: task-list` uses the same row rhythm but replaces
the Task checkbox with a List icon. Tasks-owned surfaces provide selection,
hover/focus drag handle, recursive disclosure, deletion, within-run reorder,
explicit cross-run movement, and a trailing open control. Opening mounts the
child List in a closeable adjacent column; disclosure renders the child's own
heading-aware runs in place.

The recursive indentation guide uses `--interactive-accent`. Inside a Lapis
Markdown surface that resolves to `--ui-workspace-focus-ring`, matching the
active theme's blockquote and embedded-file accent. Ordinary Markdown surfaces
retain interactive Task/checklist controls but omit planner-only creation,
delete, and drag actions.
