# Runtime

Vault Markdown is the source of truth. AppDatabase holds a disposable public
`tasks/task` projection so the planner can query summaries without parsing
every file on each paint. UI must not treat the database as authoritative.
See LN-TASK-020.

```mermaid
flowchart TD
  vault["Vault Markdown files"] --> parse["parseTaskDocument"]
  parse --> project["projectTask"]
  project --> db["AppDatabase tasks/task"]
  db --> summary["TaskSummary queries"]
  summary --> planner["Planner snapshot and UI"]
  planner --> mutate["TaskRepository mutation"]
  mutate --> vault
```

## Parse, project, query

`parseTaskDocument` in `src/lib/model/task-document.ts` returns a
`TaskDocument`, `TaskListDocument`, or `TaskNavigationDocument`.
`projectTask` in `src/lib/model/task-projection.ts` writes a typed projection
row. `task-index.ts` registers that projection and emits edges for reserved
section links.

Planner lists and cards read `TaskSummary` rows through `TaskRepository`
query wrappers. Detail and editor surfaces may reload the Markdown
`TaskDocument`. `TaskSummary` carries indexed planning fields: status, inbox,
start, plan, deadline, checklist counts, and comment count. Plan kind is
`anytime`, `morning`, `afternoon`, `evening`, or `time`, with `planTime` for
clock values. It does not include body prose or comments text.
Catalog adapters preserve the optional checklist total and completed counts
while continuing to exclude checklist item text. See LN-TASK-033.

For a `task-list`, the parser projects the page display title: its top-level
front matter `title`, then its first H1, then a human-readable stable-id
fallback. Repository list renames keep an existing front matter title and H1
in sync before reprojection, so a later mutation cannot silently expose the
raw id. See LN-TASK-015 and LN-TASK-026.

## Query views

`matchesTaskView` in `src/lib/model/task-queries.ts` is the query-AST meaning
for named views. Only `kind: task` rows match. See LN-TASK-018.

| View | Open-task match |
| --- | --- |
| Inbox | `task.inbox` is true |
| Today | `plan.date` or `deadline` is today or earlier |
| Anytime | start is actionable and there is no plan date |
| Upcoming | start date, plan date, or deadline is after today |
| Someday | `start` is `someday` |
| Completed | `status` is `completed` |
| Logbook | `status` is `completed` or `canceled` |
| Review | `plan.date` is before today |

Start is actionable when it is `anytime`, or a date on or before today.
Someday starts are not Anytime. A deadline-only open task is Today or
Upcoming from those dates; catalog adaptation must not treat it as undated
Anytime. Overdue `plan.date` stays in Review until the user reschedules,
completes, skips, or cancels.

The live planner also classifies catalog `Task` rows with `classifyTask` in
`src/lib/model/planner.ts`. That path is the Column Canvas bucket order, not
a second stored flag. See [Planner](./planner.md).

## Repository and file stores

`TaskRepository` in `src/lib/model/task-repository.ts` is the mutation
boundary. Production hosts inject `createVaultTaskFileStore` from
`src/lib/model/vault-task-file-store.ts`, which reads, writes, and trashes
through the public `App` vault. Tests and some catalog paths inject
`createMemoryTaskFileStore`.

`TasksPlugin.onload` registers the public tasks projection, constructs the
repository, loads versioned plugin data, registers the Tasks settings tab, and
mounts `TasksView` with the repository, injected clock, and live settings
source. Plugin data owns only presentation settings; task and list state stays
in Markdown.

The same onload registers the plugin-scoped `task-list-items` Markdown
contribution through the public API. The contribution supplies a CodeMirror
extension and rendered-Markdown postprocessor but imports neither Lapis
Markdown nor Mira. The API surface context carries an opaque Tasks controller
only for the Tasks-owned file surface; ordinary Markdown surfaces use document
interaction rules. See LN-TASK-035.

Settings saves are serialized. The two local `HH:mm` day-part boundaries must
be valid and ordered. Absent, older, or malformed data uses `12:00` and `17:00`.
After a successful save, every open view receives the persisted snapshot and
reclassifies clock-valued tasks without a file mutation. See LN-TASK-029.

## Mutations

`task-mutations.ts` and repository methods rewrite one Markdown file, or the
parent reserved-section links, then upsert the projection from that parse.
See LN-TASK-019. `TaskRepository.cancel` writes `task.status: canceled`.

- Completing a linked child updates the child file, not a checkbox on the
  parent.
- `getTaskDocument` lazily reads checklist contents. A checkbox mutation
  requires its checklist ordinal and expected text, replaces only that marker,
  reparses the file, writes it, and reprojects the new counts. A stale ordinal
  or text raises `TaskChecklistMutationError` without writing.
- Rolling complete may reset only `## Checklist`.
- List graph edits (pin, nest, rename, archive, delete) still go through the
  repository and then reproject. See [Lists](./lists.md).
- An Items edit uses an editor transaction while its list document is actively
  edited. A read-only edit rereads the file, verifies the exact scanned section
  text, replaces only that range, and reparses before writing and reprojecting.
  Stale source fails closed. See LN-TASK-036.
