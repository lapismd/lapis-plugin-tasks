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

The display title is the first H1, else the filename without `.md`. Lists are
not completable outcomes. YAML must not store `today` or `upcoming` flags;
those views are derived. See LN-TASK-016.

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
- `plan`: optional `{ date, at }` where `at` is `anytime`, `morning`,
  `afternoon`, `evening`, or `HH:mm`. `anytime` means that day with no
  preferred window. Morning, afternoon, and evening are loose day-parts.
  `HH:mm` is an explicit time block. `all-day` is not a task token; it is
  reserved for a future calendar or event resource.
- `deadline`, `repeat`, and `comments`: optional

A someday task must not also have an active plan. `plan.date` must not precede
a dated start.

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
