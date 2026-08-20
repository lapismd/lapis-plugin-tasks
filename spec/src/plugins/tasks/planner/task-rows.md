# Planner Task rows and checklists

Task rows are shared across the daily planner and rich Markdown TaskRuns. The
same presentation owns selection, title editing, detail opening, drag affordance,
metadata chips, and lazy checklist progress so those interactions do not drift
between surfaces.

See LN-TASK-033, LN-TASK-035, and LN-TASK-041.

## Task row interaction

A row click selects the Task. Modifier clicks toggle or extend selection. The
title enters inline title editing, and a title or body double-click opens the
expanded inline editor. Only the trailing detail control opens Task detail.
The detail control, checkbox, title line, and leading hover/focus drag handle
share one vertical center.

When present, the List chip uses the projected Task List display title. The
display title prefers front matter `title`, then the first H1, then a humanized
stable id such as `List Docs` for `list-docs`.

Rich Markdown widgets reset inherited whitespace and typography so rows keep
the same compact rhythm and card background as planner rows. Ordinary Markdown
surfaces keep the card within render width, preserve both end radii, and isolate
the Tasks checkbox tick from host Markdown checkbox selectors.

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
