# Documents

A Tasks resource is a vault Markdown file. `parseTaskDocument` in
`src/lib/model/task-document.ts` accepts three `type` values: `task`,
`task-list`, and `task-list-navigation`. The filesystem is authoritative.
Child files do not store parent or list ids. See LN-TASK-014, LN-TASK-015,
and LN-TASK-017.

CV-only catalog fields such as `applicationId`, `linkedTo`, and
`JobApplication` live in Storybook fixtures. They are not canonical document
types. See LN-TASK-011.

## Kinds

| `type` | Role | Front matter |
| --- | --- | --- |
| `task` | A completable outcome | Nested `task:` object |
| `task-list` | A grouping note | Nested `list.status` `active` or `archived` |
| `task-list-navigation` | Sidebar section pins | `id` only; headings are presentation |

Task and navigation display titles use the first H1, else the filename without
`.md`. A list display title instead uses its top-level front matter `title`,
then its first H1, then a title-cased stable id such as `list-docs` → `List
Docs`. This gives task chips and list navigation a page-owned human-readable
label without exposing an internal id. Lists are not completable outcomes. YAML
must not store `today` or `upcoming` flags; those views are derived. See
LN-TASK-015 and LN-TASK-016.

## Task

```markdown
---
type: task
id: task-tailor-cv
task:
  status: open
  inbox: false
  start: anytime
  plan:
    date: 2026-08-19
    at: anytime
    duration: 45m
  deadline: 2026-08-21
---
# Tailor platform CV variant

## Checklist
- [ ] Pull the latest role brief
- [x] Confirm the target company name

## Subtasks
- Collect references → collect-references.md

See also notes/brief.md.
```

Reserved-section rows and ordinary references are Markdown links whose href
is the relative `.md` path.

`task:` fields:

- `status`: `open`, `completed`, or `canceled`
- `start`: `anytime`, `someday`, or a `YYYY-MM-DD` date
- `inbox`: optional boolean
- `plan`: optional `{ date, at, duration }` where `at` is `anytime`, `morning`, `afternoon`, `evening`, or `HH:mm`. `anytime` means that day with no preferred window. Morning, afternoon, and evening are loose day-parts. `HH:mm` is an explicit time block. `duration` is a positive estimate such as `45m` or `1h30m`. `all-day` is not a task token; it is reserved for a future calendar or event resource.
- `deadline`: optional `YYYY-MM-DD` date independent of `start` and `plan`
- `repeat`: optional rolling recurrence rule described below
- `comments`: optional comment records described below

A someday task must not also have an active plan. `plan.date` must not precede
a dated start.

## Recurrence

Recurring tasks keep one Markdown file and advance its plan date after completion or skip. The current parser accepts this shape:

```yaml
repeat:
  strategy: rolling
  frequency: weekly
  interval: 1
  on:
    - friday
  anchor: schedule
  resetChecklist: true
  lastCompletedAt: 2026-08-14T09:30:00+01:00
  completionCount: 4
```

`frequency` is `daily`, `weekly`, `monthly`, or `yearly`. `anchor: schedule` advances from the existing plan date. `anchor: completion` advances from the completion date. Completing a rolling task keeps it open, advances `plan.date`, records completion metadata, and may reset only `## Checklist`.

The implementation does not yet interpret `repeat.on`. Monthly and yearly advancement use fixed 30-day and 365-day intervals rather than calendar-aware rules. Missed-occurrence history is not a separate resource.

## Comments

Comments remain structured task metadata rather than Markdown body prose:

```yaml
comments:
  - id: comment-final-examples
    at: 2026-08-20T10:00:00+01:00
    text: Verify the final examples.
    occurrence: 2026-08-21
    editedAt: 2026-08-20T10:15:00+01:00
    resolved: false
```

The parser requires `id`, `at`, and `text`. `occurrence`, `editedAt`, and `resolved` are optional. Projection rows expose only `commentCount`; comment authoring, editing, resolution, and presentation workflows are not specified.

## List

```markdown
---
type: task-list
id: list-docs
list:
  status: active
---
# Docs

## Items
- Writing → writing.md
- Draft design critique → upcoming/critique.md
```

`list.status` is `active` or `archived`. Archived lists stay on disk and drop
out of the sidebar tree. `list.role` may be `list` or `area`; it does not
change the document kind.

## Navigation

```markdown
---
type: task-list-navigation
id: lists-nav
---
# Lists

## Applications
- Applications → lists/applications.md

## Docs
- Docs → lists/docs.md
```

A vault may have at most one authoritative navigation file, usually
`lists.md`. Headings are sidebar sections, not resources. Links under those
headings pin root lists. See [Lists](./lists.md) and LN-TASK-023.

## Reserved sections and link kinds

The body parser in `task-document.ts` walks headings and list items.
`structuralLinkKind` assigns kind from the nearest heading. Navigation
documents then remap every link to `navigation-item`.

| Heading | Indexed kind | Payload |
| --- | --- | --- |
| `## Checklist` | none | `- [ ]` / `- [x]` checkboxes only |
| `## Subtasks` | `subtask` | Hyphen list of Markdown links to task files, not checkbox-wrapped |
| `## Items` | `list-item` | Hyphen list of Markdown links to task or task-list files |
| Any other heading, or no heading | `reference` | Ordinary links |
| Navigation file, any heading | `navigation-item` | Pin to a root list |

Other body prose is ordinary Markdown. Membership of a task in a list is the
parent’s `## Items` link, not a field on the child. See LN-TASK-021.

Canonical Items sections are also Markdown extension boundaries. Tasks scans
the complete source and recognizes each exact `## Items` heading independently
only when the section contains top-level Markdown list links and whitespace.
The scanner records source ranges and authored labels/targets; it does not
normalize, move, or serialize the document during rendering. A nested list,
checkbox, paragraph, code block, or other unsupported row makes that section
ordinary Markdown rather than allowing a partial replacement. Multiple valid
Items sections may occur before, between, or after prose and retain those
positions. See LN-TASK-034.

### Checklist identity and edits

Checklist contents remain Markdown body content rather than projection data.
The projection stores only total and completed counts. When a task row opens
its checklist disclosure, the repository loads the current `TaskDocument` and
returns the ordered checkbox items.

A checkbox does not have a stored id. A guarded edit therefore addresses the
item by its parser-provided ordinal within `## Checklist` plus its exact parsed text.
Both values must still match the current file. The mutation changes only the
single `[ ]` or `[x]` marker and preserves headings, whitespace, prose, links,
and every other checklist line byte-for-byte. The changed Markdown is reparsed
before the file and projection are updated. A stale ordinal or text mismatch
does not fall through to another checkbox and does not write the file. See
LN-TASK-033.

## Design influences and current differences

The original design notes combined selected concepts from Things, Superlist, and Tiimo with rules introduced by the Markdown-first architecture. The product names record provenance only. They do not imply file-format compatibility, feature parity, or a dependency on those products.

| Source | Retained concepts |
| --- | --- |
| Things | Actionability separate from daily planning, an independent deadline, explicit Someday state, derived smart views, lightweight checklists, and schedule- or completion-anchored recurrence |
| Superlist | Rich task bodies, linked full subtasks, lists that contain tasks or lists, navigation separate from ownership, and Inbox independent from structure |
| Tiimo | Daily intention, loose day-parts, estimated duration, deliberate review of overdue plans, rolling recurrence, and resettable routine checklists |
| Markdown-first design | YAML state, Markdown content, structural links in reserved sections, Markdown-owned order, stable resource IDs, and a disposable database projection |

The daily agenda adapts, rather than copies, the Things daily-planning and
Tiimo day-part ideas. Its five fixed sections, configurable clock boundaries,
selected-date week strip, and completion-date Done grouping are Tasks-owned
rules. Canonical `plan.date`, `plan.at`, `deadline`, and completion state remain
authoritative; settings alter classification only.

The row footer retains the lightweight checklist idea from Things and Tiimo,
but its lazy document load, aggregate-only projection, and guarded Markdown
marker mutation are repository-specific rules. Checklist items remain embedded
content; they are not promoted to independent task resources by checking or
unchecking them.

The shared rich Items rendering is presentation over the original Markdown,
not a replacement document model. Reading mode, embedded previews, live
preview, and the Tasks list page all resolve the same authored links while
source mode remains literal. This preserves the Markdown-first influence:
section order and surrounding prose remain author-owned even when Tasks adds
interactive controls. See LN-TASK-035 and LN-TASK-037.

The current repository does not implement every possibility in those source notes:

| Concept from the notes | Current repository position |
| --- | --- |
| Dedicated Deadlines smart view | Not defined. Deadlines participate in Today and Upcoming queries. |
| Promote a checklist item to a full task | Not defined as a mutation or interface workflow. You can create a task file and add its link under `## Subtasks`. |
| Duration drives workload budgets, automatic scheduling, calendar placement, or artificial intelligence planning | Not implemented. `plan.duration` parses, round-trips, projects to minutes, and reaches catalog tasks. |
| Full recurrence grammar | Partial. The parser retains `repeat.on`, but recurrence advancement does not interpret it. Monthly and yearly advancement currently use fixed day counts. |
| Comments form a complete collaboration surface | Partial. Comments parse, serialize, and contribute a projection count, but interaction workflows are not specified. |
| Stable IDs make arbitrary filesystem moves transparent | Partial. IDs survive content-preserving changes, but structural Markdown links remain path-based. Generic backlink repair after an external rename or move is not specified. |
| Every task or list has one structural parent across all relationship kinds | Partial. The list tree rejects cycles and multiple incoming `list-item` parents for task lists. The contract does not enforce one parent across both `subtask` and `list-item` relationships for every task. |
| Every Markdown construct has dedicated Tasks editing controls | Not promised. Task bodies remain ordinary Markdown, and rendering or editing depends on host Markdown surfaces. |

Use this section to understand why the model has its current boundaries. The [Tasks plugin requirements](./index.md) remain normative. [Runtime](./runtime.md) defines query and mutation behavior, [Lists](./lists.md) defines structural ownership, and [Planner](./planner.md) defines view classification.
