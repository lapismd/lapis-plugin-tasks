# Custom recurrence suggestion readiness

LN-TASK-046 and LN-TASK-052 retain the real custom recurrence editing and
persistence acceptance. This story-only change waits for the existing Tomorrow
suggestion visibility assertion inside the existing `waitFor` callback. Its
selector, timeout, click and final recurrence-state assertions are unchanged.
There is no runtime or dependency change and no visual baseline approval.

## Original evidence and diagnosis limits

Tasks version PR #25 head `29a78841d3bf7de80ae171cb034ce1473106911d`, CI
`43802388963`, exact merge source
`dd933433f417dd60287f6362d8926fe9af48f984`: shard 3 failed one story,
`ApplicationTaskPreviewRow.stories.svelte > CustomTrackedRecurrence`, with
41 passing stories. The failed element is a hidden
`button.ui-autocomplete-input__item.active`.

That class belongs to the later Tomorrow autocomplete suggestion. Published
Design Core 0.13.4's InlineOptionPicker options instead belong to
`cv-form-inline-option-list`; the stack's mapped end-condition source line is
insufficient evidence to identify the failed control. The original story
accepted nonempty layout rectangles before asserting visibility outside the
polling boundary. Layout presence does not establish visibility through its
ancestors. Moving the same assertion into polling closes that readiness gap
without changing product behavior or accepting a hidden suggestion.

The actual hidden ancestor/timing was not captured in the hosted diagnostic.
This is not a claim that a deterministic product defect was reproduced or that
the full hosted failure's timing cause is known. No Design Core fix is inferred.

## Cold controls and focused acceptance

All local browser commands use the default Docker runtime, registry-only frozen
installation and fresh Vitest/browser processes. Source main:
`80c5d166ae97a7fdcf6e40dd82f855acbd1d8963`; Core 0.13.4; Playwright 1.62.1.

| Command / boundary                                                                                                                      | Before edit                                  | After edit                                   |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| `pnpm test:storybook -- src/lib/tasks/application-task-preview-row/ApplicationTaskPreviewRow.stories.svelte -t CustomTrackedRecurrence` | 1 passed, 0 failed; 8 intentionally filtered | 1 passed, 0 failed; 8 intentionally filtered |
| `pnpm test:storybook -- --shard=3/3`                                                                                                    | 42 passed, 0 failed                          | Pending complete interactions below          |

Unchanged cold controls do not replace the original hosted failure receipt.
Original failure: 1/42. Local unchanged controls: 0/1 and 0/42 failures. Local
focused repaired story: 0/1 failures. Broader qualification is recorded below.

## Complete validation

Default-Docker `pnpm validation:all` passes on the repaired story bytes:

- `check`, including routing/parity, App ownership, strict Svelte (zero errors
  and warnings), TypeScript and native/operation checks.
- `test`: 2,930 unit tests and 29 native/provider tests; zero failures.
- `build`, `publint` and static `build-storybook`.
- Complete Storybook interactions: 15 + 9 + 42 = 66 passing cases under the
  unchanged accessibility annotations and fatal runtime-diagnostic guard.
  Four non-executable catalog files remain filtered by existing policy; no
  filtering or timeout changed. The repaired story passes in the full shard.
- `spec:check`, including App ownership, and immutable npm artifact preparation.
- Registry checks (23 focused cases), media verification, bundle preparation and
  cold development plus production archive-host acceptance of the actual Tasks
  plugin, planner, details, Markdown composer and teardown.

Run receipt: `lapis-tasks-run-21c9870c-98e6-4b45-af26-85aff7cc0afb`.
The exact repaired story and cold complete preview-row family separately pass
1 and 9 cases respectively. There are zero functional, interaction or
accessibility failures in the executed post-change lanes.

`pnpm audit --json` and `pnpm audit --prod --json` both exit zero under the
unchanged repository policy. Production metadata has zero findings; all-deps
metadata retains the existing development-only LOW advisory ignored by the
tracked GHSA policy. No exception was added or broadened.

Spec Validator remains the latest Deno-free 0.2.0. Doctor passes its config,
QMD/native, book and skill checks with the existing wrapper-alias warning;
semantic `pnpm spec:search` succeeds. Changed specification/evidence Markdown
passes formatting. Final evidence-only edits receive another `pnpm spec:check`.

Runtime/package Changeset is not warranted for this story-only correction.
Existing `visual-pending` metadata and all recurrence assertions remain. Hosted
CI of the final source PR and qualification of the generated version PR remain
separate from these local receipts.
