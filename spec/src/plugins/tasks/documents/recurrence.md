# Rolling recurrence

Tasks supports one recurrence strategy: a single Task document rolls forward
after each occurrence. Completion updates that same Markdown file; it does not
create an occurrence file or a completion-history row.

See LN-TASK-019, LN-TASK-032, and LN-TASK-044.

## Repeat schema

`task.repeat` is optional. When it is present, `frequency` is required and the
parser normalizes the complete value to this shape:

```yaml
task:
  status: open
  plan:
    date: 2026-08-21
    at: morning
  repeat:
    strategy: rolling
    frequency: weekly
    interval: 2
    anchor: schedule
    resetChecklist: true
    lastCompletedAt: 2026-08-07T09:15:00.000Z
    completionCount: 4
```

| Field | Meaning | Parse behavior |
| --- | --- | --- |
| `strategy` | Recurrence model | Always normalizes to `rolling` |
| `frequency` | `daily`, `weekly`, `monthly`, or `yearly` | Required; an invalid value rejects the repeat block with a diagnostic |
| `interval` | Number of frequency units per advance | Positive number; defaults to `1` |
| `anchor` | Date used to calculate the next occurrence | `schedule` or `completion`; defaults to `schedule` |
| `on` | Reserved string-list metadata | Preserved and serialized, but the current scheduler does not interpret it |
| `resetChecklist` | Whether completion clears lightweight checkboxes | `true` enables reset; otherwise `false` |
| `lastCompletedAt` | Timestamp of the latest completed occurrence | Optional timestamp string written by the completion mutation |
| `completionCount` | Number of completed rolling occurrences | Numeric counter; defaults to `0` and increments on completion |

`lastCompletedAt` and `completionCount` describe the rolling Task, not separate
history records. The Markdown document remains authoritative for the complete
repeat object. The disposable projection indexes only strategy, frequency,
interval, and anchor for summary queries.

## Recurrence editor

The shared recurrence popover is a structured editor for this schema. Its
Command View presets are Does not repeat, Daily, Weekly, Monthly, and Yearly.
Choosing a frequency preset writes interval `1` with schedule anchoring while
preserving an existing `lastCompletedAt` and `completionCount`.

Custom recurrence exposes interval, frequency, schedule/completion anchor, and
checklist reset. Applying it writes the scheduling fields through the Task
callback; the canonical mutation merges retained completion metadata from the
current Markdown document before serialization. Removing
recurrence clears only `task.repeat`; it does not change the Task's plan or
checklist. Reserved `on` metadata is not exposed because the scheduler does not
currently interpret it. See LN-TASK-045–046.

## Completion lifecycle

Completing a non-recurring Task sets `status: completed` and `completedAt`.
Completing a recurring Task instead performs one roll-forward transaction:

1. Keep `status: open` and clear `completedAt`.
2. Clear `inbox`.
3. If a plan exists, advance `plan.date` once and preserve its `plan.at`, time,
   and duration fields.
4. Record the completion timestamp in `repeat.lastCompletedAt`.
5. Increment `repeat.completionCount` once.
6. If `resetChecklist` is true, change every lightweight checkbox marker in
   the Task body to unchecked.

A recurring Task without `task.plan` records its completion metadata and stays
open but does not invent a plan date. Recurring completion therefore does not
enter the daily agenda's Done section.

## Anchor and date advancement

The anchor chooses the starting date for the next occurrence:

| Anchor | Starting date |
| --- | --- |
| `schedule` | Current `plan.date`; a planless recurring Task does not write a next date |
| `completion` | Local calendar date of the completion timestamp |

The current implementation advances local calendar dates by fixed day counts:

| Frequency | Days added |
| --- | --- |
| `daily` | `interval` |
| `weekly` | `7 × interval` |
| `monthly` | `30 × interval` |
| `yearly` | `365 × interval` |

Monthly and yearly recurrence are therefore fixed-day intervals, not
same-calendar-day rules. Each completion advances exactly one interval; it does
not synthesize missed occurrences or catch-up history.

## Skip lifecycle

Skip is available only when the Task has both `repeat` and `plan`. It advances
`plan.date` once with the same anchor and frequency rules, keeps the Task open,
and leaves `lastCompletedAt`, `completionCount`, and checklist markers
unchanged. Calling skip without a repeat block or plan is a no-op.

## Source and mutation boundary

`parseRepeat` in `src/lib/model/task-document.ts` owns normalization.
`nextRollingDate`, `completeTaskDocument`, and `skipOccurrence` in
`src/lib/model/task-mutations.ts` own advancement. Completion and skip run
through `TaskRepository`, serialize the updated Task front matter and exact
checklist marker changes, then reparse and reproject the file. Planner surfaces
use the injected clock for the completion timestamp. Structural membership
links in parent Tasks or Lists are not changed by a recurrence mutation.
