# Task documents and structural runs

The Tasks model is Markdown-native. A Task or Task List is a normal rich
Markdown document with a small typed front matter envelope. Headings, prose,
images, tables, code, block quotes, ordinary links, and lists remain authored
content. The derived index accelerates queries and validates relationships; it
does not replace the source document.

See LN-TASK-014–017 and LN-TASK-034–042.

## Document kinds

### Task

```markdown
---
type: task
id: t_release_parser
task:
  status: open
  start: anytime
  plan:
    date: 2026-08-21
    at: morning
---

# Implement the release parser

Background and design notes can appear anywhere.

## Development

- &#91;Write scanner tests&#93;(./write-scanner-tests.md)

Compatibility notes remain ordinary prose.

## Follow-up

- &#91;Parser documentation&#93;(../lists/parser-documentation.md)
```

`task.status` is `open`, `completed`, or `canceled`. `task.start` is
`anytime`, `someday`, or an ISO date. Optional planning fields remain separate:

- `inbox` controls capture state
- `plan.date` selects a day and `plan.at` selects a day part or `HH:mm`
- `deadline` is a hard due date and does not imply a plan
- `repeat` describes the date-only [RRULE recurrence
  model](./documents/recurrence.md)
- `tracking` describes boolean or quantitative habit observations and requires
  recurrence in this release
- `comments` stores task-owned comment metadata

Today, Review, Upcoming, and Logbook are derived views, never stored flags.

### Task List document

```markdown
---
type: task-list
id: l_release_v2
title: Release v2
list:
  status: active
---

# Release v2

Background notes about the release.

## Development

Some development context.

- &#91;Implement parser&#93;(../tasks/implement-parser.md)
- &#91;Website&#93;(./website.md)

## Documentation

- &#91;Migration guide&#93;(../tasks/migration-guide.md)

More notes can appear here.
```

`list.status` is `active` or `archived`. A List is organizational and is not a
completable Task. Its display title is front matter `title`, then the first H1,
then a humanized stable id.

### Navigation document

`type: task-list-navigation` is a separate presentation document. Its headings
name sidebar sections and its links pin root Lists. Those links derive
`navigation-item`, never structural ownership. Reading and live preview may
replace resolved Task List links with the shared rich List row, but that visual
composition does not turn them into `list-entry` or expose planner mutations.
See [Lists](./lists.md).

## Structural candidate rules

Only an unordered list item whose complete direct content is one local Markdown
link is a structural candidate. The target document decides its final kind.

| Authored Markdown | Result |
| --- | --- |
| `- &#91;Parser&#93;(./parser.md)` targeting `type: task` | `task-entry` |
| `* &#91;Website&#93;(./website.md)` targeting `type: task-list` | `list-entry` |
| `- &#91;Missing&#93;(./missing.md)` | Ordinary Markdown plus unresolved diagnostic |
| `- &#91;Reference&#93;(./note.md)` targeting an ordinary note | Ordinary reference plus unsupported-target diagnostic |
| `- See &#91;Parser&#93;(./parser.md)` | Ordinary rich list item |
| `1. &#91;Parser&#93;(./parser.md)` | Ordinary ordered list item |
| `- &#91;External&#93;(https://example.com)` | Ordinary external link |
| `- &#91;Section&#93;(#development)` | Ordinary fragment link |
| `- [ ] Draft migration notes` | Lightweight checklist item in a Task; ordinary Markdown in a List |

Indentation does not change classification. A supported nested unordered list
item can become a structural entry at its own `listDepth`; its parent list item
remains ordinary when it contains additional content or a nested list.

The scanner retains the authored label and href. It resolves links with the
host's normal path semantics and reads the target front matter. A label such as
“Website” does not make an entry a List; only `type: task-list` does.

## Heading context

H1 owns the document title and is excluded from grouping. H2–H6 provide
Things-style grouping context without reserved names.

```markdown
## Garden

### Preparation

- &#91;Clear bushes&#93;(./clear-bushes.md)
```

The derived entry context is:

```ts
{
  headingPath: ["Garden", "Preparation"],
  headingLevel: 3,
  headingText: "Preparation"
}
```

A same-or-shallower heading closes the previous branch. Entries before the
first H2 use the implicit root group:

```ts
{
  headingPath: [],
  headingLevel: null,
  headingText: null
}
```

Heading paths are disposable parse output. They are never copied to front
matter, so renaming or moving a heading changes one Markdown range and the next
index rebuild derives the new grouping.

In reading mode and live preview, an H2-H6 that actually owns a resolved rich
TaskRun is presented with the same pill-shaped category chrome as a Today
section. A heading in a Task document also qualifies when its content includes
lightweight checklist items, even if it has no structural TaskRun. Qualifying
headings are ordered by their source ranges and rotate through the Tasks
neutral, warning, info, accent, and success roles; separate runs under the same
heading retain one colour. This is derived presentation only: H1, implicit-root
entries, headings with ordinary Markdown alone, and source-mode headings remain
normal Markdown, and no colour or grouping field is written to front matter.

## Contiguous `TaskRun` groups

A heading can contain several independent structural runs because ordinary
content may occur between them:

```markdown
## Development

- &#91;Parser&#93;(./parser.md)

Important compatibility notes.

- &#91;Tests&#93;(./tests.md)
- &#91;Benchmark&#93;(./benchmark.md)
```

This is two runs. Sorting the second run may exchange Tests and Benchmark but
may not move Parser across the prose. A run is maximal only while entries share:

- the same source document and Markdown list
- the same list nesting depth
- the same heading path
- consecutive list positions with no unresolved or ordinary item between them

Headings, prose, images, tables, code blocks, checkboxes, ordinary links, and
unsupported structural candidates all bound or split a run.

## Derived index shapes

The public projection stores enough information to reproduce source order,
perform guarded edits, and refresh recurrence-derived effective dates without
changing the source document. Projection registration and every repository-owned
reindex use the same injected local-date source, so a metadata rebuild,
structural validation, or checklist edit cannot replace refreshed occurrence
state with a different calendar day:

```ts
interface StructuralEntry {
  sourceDocumentId: string;
  sourceDocumentPath: string;
  targetDocumentId: string;
  targetDocumentPath: string;
  kind: "task-entry" | "list-entry";
  headingPath: string[];
  headingLevel: number | null;
  headingText: string | null;
  runId: string;
  positionInRun: number;
  sourceStart: number;
  sourceEnd: number;
  authoredLabel: string;
  authoredHref: string;
}

interface IndexedTaskRun {
  id: string;
  documentId: string;
  documentPath: string;
  headingPath: string[];
  headingLevel: number | null;
  headingText: string | null;
  listDepth: number;
  startOffset: number;
  endOffset: number;
  entryCount: number;
}
```

The Markdown source remains authoritative. The structure also carries a source
hash and diagnostics so a consumer can reject stale edits. The complete Tasks
projection may be deleted and rebuilt without losing membership, grouping, or
ordering.

## Relationship graph

Structural ownership is singular across both relationship kinds:

- Task List → Task (`task-entry`)
- Task List → Task List (`list-entry`)
- Task → Task (`task-entry`)
- Task → Task List (`list-entry`)

The target type selects the edge kind; the source type does not restrict it.
One Task or List may have at most one distinct structural parent. Repeating the
same target in multiple runs of the same source is still one parent for graph
validation, though each authored occurrence retains its own range.

Whole-vault validation detects distinct multiple parents, self-links, and
recursive strongly connected components. Invalid links remain visible and
editable in Markdown but are removed from the active derived graph. Ordinary
`reference` and presentation-only `navigation-item` links may point to the same
target any number of times.

## Lightweight checklists

Any ordinary Markdown checkbox in a `type: task` body contributes to that
Task's checklist aggregate, regardless of heading text. It does not establish a
child Task relationship. Task-list checkboxes remain document content and do
not contribute progress.

Checklist mutations identify an item by derived ordinal and expected text,
verify its exact source range, and change only `[ ]`/`[x]`. A stale range or
label fails closed. Recurring completion with `resetChecklist: true` resets all
lightweight checkbox markers in that Task.

## Influences and retained concepts

The model combines ideas rather than cloning one product:

| Influence | Retained concept | Deliberate Tasks interpretation |
| --- | --- | --- |
| Things | Projects as rich documents and headings as meaningful task groups | Any H2–H6 can group entries; source headings remain ordinary Markdown |
| Superlist | Tasks and Lists may nest recursively and appear together | Typed target documents determine `task-entry` versus `list-entry`; ownership stays singular |
| Tiimo | A selected-day agenda with friendly day-part buckets | Day-part boundaries are plugin settings and remain separate from document hierarchy |
| Obsidian/Lapis Markdown | Files, links, headings, and live preview stay user-authored | CST ranges and host link resolution preserve source and compose rich widgets without replacing Markdown |

The current implementation is authoritative where it differs from an
inspiration application. In particular, structural order is Markdown order,
TaskRun is the only safe sort boundary, and the derived database is disposable.
