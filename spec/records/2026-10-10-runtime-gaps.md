# Tasks runtime actions and column headers, 10 October 2026

This records implementation of the reviewed gaps under LN-TASK-059–069. The
original review and accepted runner mitigation remain in
[the earlier review record](./2026-10-10-review.md).

## Result

Task priority and local comments persist in canonical Task Markdown. Details
support comment editing, deletion and resolution, Duplicate, Copy link, browser
Print, direct-child bulk reopen, preview hiding, explicit recurrence skip, and
tracked History with 7/30/90-day statistics. Unsubscribe and the fabricated chat
composer are omitted. Seven navigation destinations remain; Logbook adds outcome
filters.

Following review feedback, double-click immediately opens the existing compact
inline editor. Notes use the styled auto-sized body field with no Edit/Read
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
