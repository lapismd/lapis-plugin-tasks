# Tasks runtime actions and column headers, 10 October 2026

This records implementation of the reviewed gaps under LN-TASK-059–069. The
original review and accepted runner mitigation remain in
[the earlier review record](./2026-10-10-review.md).

## Result

Task priority and local comments persist in canonical Task Markdown. Details
support comment editing, deletion and resolution, Duplicate, Copy link, browser
Print, direct-child bulk reopen, preview hiding, explicit recurrence skip, and
tracked History with 7/30/90-day statistics. Unsubscribe and unsupported chat
services are omitted. Seven navigation destinations remain; Logbook adds outcome
filters.

Following review feedback, double-click immediately opens the existing compact
inline editor. Notes use a compact body-only Markdown live-preview editor with no Edit/Read
toggle, properties, front matter, or duplicate title. The title and compact row
footer retain their existing styling. Body saves preserve concurrent title and
metadata changes, reject concurrent body changes, and retain failed drafts for
retry before collapse/navigation. Full-document editing stays in the column
header. Daily manual order is stored separately as `tasks.agendaOrder` in the
selected canonical daily note;
viewing an agenda does not create that note or reorder structural List links.

Document structure actions create/rename headings and add a Task or nested List
under a chosen heading. Following review feedback, their compact Plus button
sits beside Edit/Close in the owning main List, linked List, or Task detail
header. The Markdown body has no extra action strip. Existing Lapis typography
and public Design Core controls remain the presentation authority.

## Repaired regressions

| Boundary                                                                          | Before                         | After | Repair                                                                                                                                      |
| --------------------------------------------------------------------------------- | ------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Expanded-row tracking and opaque recurrence removal, `apply-catalog-task.test.ts` | 2 failing regressions          | 0     | Preserve explicit tracking patches and distinguish clearing unsupported recurrence from an unchanged field.                                 |
| Task projection schema expectation                                                | 1 failure                      | 0     | Advance the public API and Tasks disposable projection together to version 4 with nullable priority.                                        |
| Editor-owned parent cleanup in List deletion                                      | 1 failure                      | 0     | Preserve `skipParentPaths` rather than rewrite an already-processed editor transaction.                                                     |
| Concurrent heading edit, `task-runtime-actions.test.ts`                           | 1 failure                      | 0     | Compare the source inside the guarded vault transaction and retain concurrent content.                                                      |
| Quantitative history with mixed units, `task-history.test.ts`                     | 1 failure                      | 0     | Omit incompatible totals/averages while retaining completion and streak statistics.                                                         |
| Priority marker in `RuntimeDetailActions`                                         | 1 axe failure                  | 0     | Give the labelled visual marker an image role.                                                                                              |
| Catalog `ColumnCanvas` and `NavigationStates`                                     | 2 failures                     | 0     | Assert unsupported List actions are omitted from the fixture instead of exposing no-op callbacks. Real App List actions remain covered.     |
| `RuntimeDetailBulkActions` host checklist hiding                                  | 1 functional failure           | 0     | Match the host label wrapper with semantic checkbox selectors; verify Hide/Show never writes Markdown and bulk reset reopens the checklist. |
| `LiveEditMutations` and `DeepNavigationFlow`                                      | 1 functional and 1 axe failure | 0     | Flush the parent List without closing its editor during child deletion; name comments/history landmarks for their owning Task.              |
| `RuntimeInlineNotesAndOrder` immediate compact editor                             | 1 functional failure           | 0     | Restore the existing body-only field on double-click in agenda and List task rows; preserve guarded saving, failed drafts, and retry.       |

The cold desktop play awaits the detail opener after an inline Notes flush.
The catalog Notes check awaits the existing expansion animation. Existing
content, geometry and source-edit assertions remain.
New runtime acceptance exercises comment and clipboard failures, dirty Notes
retention and retry, daily-order persistence, heading mutations, duplication,
tracked skip/history, and print-frame rendering/disposal. Ordinary Markdown
acceptance retains completion/checklist/open-note controls and explicitly omits
unsupported editing, deletion and reorder actions.

## Verification

- Focused inline model run: nine tests passed, including concurrent body guards
  and title/metadata preservation. The earlier four-boundary model run passed
  19 tests.
- Final package run: 201 unit tests passed in 37 files; `pnpm check`, `pnpm build`
  and `pnpm publint` passed. Svelte reported zero errors and zero warnings.
- Exact repaired catalog target: 2 stories passed. Exact child-delete/deep-detail
  target: 2 stories passed, including enabled axe checks.
- Static Storybook build passed against the final source.
- Complete interaction/accessibility batches passed all 56 stories
  (13 + 8 + 35), across 19 story files, with four metadata-only files retaining
  their existing skipped tags. No functional assertions or enabled axe checks
  failed.
- `pnpm spec:check` passed. The fresh Storybook process passed the Desktop
  Workspace play. Live double-click review confirmed the immediate editable
  Notes field, no document chrome or YAML, and inherited DM Sans typography
  at 13.12px.

The exact inline regression command was:

```sh
pnpm exec vitest run --config scripts/vitest-storybook-batches.config.mjs \
  --project storybook src/stories/PluginWorkspace.stories.svelte \
  -t RuntimeInlineNotesAndOrder
```

It failed once against the full-document toggle flow and passes with the compact
editor, including agenda and List rows, failed-save retention, retry, and daily
ordering. The catalog `ExpandedMetadataActions` target also passes after its
new Notes assertion was made to await the existing expansion animation.

The batched command remains `node scripts/test-storybook-batches.mjs`. It
partitions every discovered story file into three fresh processes and fails on
any failed batch. The intermittent unbatched orchestrator disconnect remains
open; no assertions or axe rules were relaxed. No visual baselines were captured
or updated; visual review remains pending.

## Upstream and consumer scope

Lapis Notes commit `8895c429` adds the public priority projection and aligns the
stale default-profile test/specification with the intentionally bundled
Community fifth default. It changes no profile registration code. API projection
acceptance passed four focused tests and all 799 API tests; app-profile passed
three tests. Root specification, check and test lanes passed. Check and test each
completed 18 tasks, and the final root build completed ten tasks including web
and desktop bundles.

The Tasks real-App shell exercises public API, Markdown and Workspace package
contracts. The existing local pnpm hook was refreshed with
`pnpm install --lockfile=false --force`; it is a temporary local acceptance setup.
Pre-existing Tasks manifest/lockfile edits are excluded from the implementation
commit. Generated Deno lockfile churn was restored. Registry publication, native
Print, and native packaged interactive qualification were not performed. The
existing five-plugin profile's browser/packaged qualification remains explicitly
pending in Lapis Notes verification.

## Design Core comment presentation follow-up

Task comments now compose the same public Design Core chat primitives used by
Lapis AI: `MessageList`, user `Message`/`MessageBubble`, `TokenizedText`,
`MessageMetadata`, and `Composer`/`ComposerInput`. Shared tokens own bubble
colours, spacing, typography, and composer styling. Stored timestamps,
edited/resolved state, and compact labelled edit/resolve/reopen/delete controls
remain visible. Comment persistence and mutation guards stay in Tasks. No
Design Core or AI implementation was changed.

The exact `RuntimeDetailActions` command shown below reported one failure before
the change because the custom comment form had no shared chat composer. It now
passes, checking transcript composition, timestamp source, Enter-to-post,
failed-post draft restoration, resolution, reopening the detail, editing,
failed-edit retry, and deletion.

```sh
pnpm exec vitest run --config scripts/vitest-storybook-batches.config.mjs \
  --project storybook src/stories/PluginWorkspace.stories.svelte \
  -t RuntimeDetailActions
```

Comments and History now use the public Design Core shadcn Accordion controls
with leading right/down chevrons. Comments start open, History starts closed,
and the sections can open independently. Unsent drafts survive collapse and
keyboard reopening.

The exact disclosure regression command was:

```sh
pnpm exec vitest run --config scripts/vitest-storybook-batches.config.mjs \
  --project storybook src/stories/PluginWorkspace.stories.svelte \
  -t 'RuntimeDetailActions|RuntimeHistoryAndSkip'
```

Both stories failed against the native summaries, which did not expose the
shared button/icon contract. The initial Accordion integration passed its
interactions but produced two axe heading-order failures: its default level
three skipped a level below the Task title. Setting the public trigger's
`level` to two repaired both. The exact target now passes two stories with zero
functional or axe failures, including keyboard reopening and draft retention.

The first specification gate also reported one missing governance chapter
update. The canonical Shell comment acceptance scope was added alongside
LN-TASK-061, and the exact gate then passed. Final package, full batched
interaction/accessibility, static-build, specification, and cold review checks
passed against the final Accordion source:

- `pnpm check`: zero Svelte errors or warnings; type, specification, App
  ownership, and native-CSS audits passed.
- `pnpm test`: 201 tests passed in 37 files.
- `pnpm build` and `pnpm publint`: passed with the refreshed public `dist`
  exports.
- `node scripts/test-storybook-batches.mjs`: all 56 stories passed
  (13 + 8 + 35), across 19 files; four existing metadata-only files remained
  skipped. Zero functional or enabled axe failures.
- `pnpm build-storybook`: passed; production preview built in 3 minutes
  36 seconds.
- Final `pnpm spec:check` and documentation formatter check: passed.
- Fresh Storybook on port 7030 completed the Desktop Workspace play. Live
  review posted, resolved, and deleted local demo comments, checked collapsed
  and expanded shared chevrons, and reopened Comments using Enter. The shared
  bubble, stored timestamp, resolved state, labelled actions, and composer were
  reviewed together.

Stories remain `visual-pending`; no screenshot comparisons or baselines were
updated.

## Inline Markdown live-preview follow-up

Repository-backed inline Notes now mount the public API `Editor` with the App's
complete registered Markdown live-preview extensions and the real source path.
The existing row title and footer remain in place. Public Mira typography and
file-margin tokens keep the body compact and growing with its content. The
buffer contains only Notes below the authored title; external editor
persistence leaves guarded complete-file writes with the Tasks repository.
No Markdown or Mira runtime dependency was added to Tasks.

The exact regression is:

```sh
pnpm exec vitest run --config scripts/vitest-storybook-batches.config.mjs \
  --project storybook src/stories/PluginWorkspace.stories.svelte \
  -t RuntimeInlineNotesAndOrder
```

It failed one story against the textarea because no Markdown live-preview
editor existed. The initial integration also failed one story while the row
was still animating; the visibility assertion now waits for the existing
expansion. Subsequent integration runs failed the same story because a Task
projection refresh after saving recreated the editor, leaving the next edit
on a detached buffer. Deriving the stable source path prevents that lifecycle
reset. The story now verifies that the buffer remains connected after a
completed guarded save before isolating the failed-save phase.

The exact story passes with zero functional or enabled axe failures. It verifies
rendered bold Markdown, editable body-only buffers, blur persistence, failed
draft retention and retry, daily ordering, List-row persistence, and reopening
saved Markdown. The final expanded editor is included in axe acceptance.
Final validation passed: `pnpm spec:check`, `pnpm check` (zero Svelte errors or
warnings), all 201 unit tests in 37 files, `pnpm build`, and `pnpm publint`.
The complete fresh-process Storybook batches passed all 56 stories (13 + 8 + 35)
across 19 files with zero functional or enabled axe failures; four existing
metadata-only files remained skipped. `pnpm build-storybook` passed in 51 seconds,
and the documentation formatter check passed. Storybook was restarted on port
7030 for review. The fresh automated runs provide cold lifecycle acceptance;
manual visual review and visual baselines remain pending.
