# RRULE recurrence and habit tracking

Tasks recurrence is date-only and Markdown-first. One `type: task` document
represents the active rolling Task; RFC 5545 determines its calendar
occurrences. Daily Markdown documents record what happened on an occurrence.
Both database projections are disposable and rebuildable.

See LN-TASK-019, LN-TASK-032, and LN-TASK-044–055.

## Conceptual model

The model separates four things that must not collapse into one field:

1. The recurrence set is the RRULE plus DTSTART-like `start`, RDATE, and EXDATE.
2. Anchor and missed policy select the active occurrence from that set.
3. The rolling Task plan points at the currently actionable occurrence.
4. Daily observations record completed or missed outcomes; an expected date
   without an observation is unrecorded.

The resolver produces one effective occurrence with state `current`,
`overdue`, `future`, `exhausted`, `paused`, or `unsupported`. It never expands a
recurring Task into repeated planner rows and never rewrites Task Markdown just
because the local date changed.

## Canonical repeat schema

`task.repeat` stores the RRULE property value without an `RRULE:` prefix:

```yaml
task:
  status: open
  plan:
    date: 2026-08-21
    at: morning
  repeat:
    start: 2026-08-21
    rrule: FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=24
    anchor: schedule
    missed: carry
    rdate: [2026-08-22]
    exdate: [2026-08-24]
    resetChecklist: true
    paused: false
    pauseRanges:
      - start: 2026-08-10
        end: 2026-08-12
    lastCompletedAt: 2026-08-19T09:15:00.000Z
    completionCount: 4
```

| Field | Contract |
| --- | --- |
| `start` | Local `YYYY-MM-DD` recurrence origin. Required for schedule anchoring; completion anchoring may set it on first completion. |
| `rrule` | Required RFC 5545 property value retained verbatim. |
| `anchor` | `schedule` or `completion`; defaults to `schedule`. |
| `missed` | `carry` or `skip`; defaults to `carry`. Completion anchoring always uses carry. |
| `rdate` | Optional date-only inclusions composed through `RRuleSet`. |
| `exdate` | Optional date-only exclusions. EXDATE wins over DTSTART, RRULE, and RDATE. |
| `resetChecklist` | Completion resets lightweight checklist markers only when true. |
| `paused` / `pausedSince` | Active pause state and the local date on which it started. |
| `pauseRanges` | Persisted inclusive historical ranges excluded from expectations. |
| `lastCompletedAt` | Timestamp of the latest completed occurrence. |
| `completionCount` | Recurrence lifecycle state required for completion-anchored COUNT; not a displayed statistic. |

Date values must be real calendar dates. COUNT and UNTIL are mutually
exclusive. UNTIL executes only in date-only `YYYYMMDD` form. A completion
anchor with `missed: skip`, a schedule anchor without `start`, malformed pause
ranges, invalid timestamps, or a negative/non-integral completion count makes
the block invalid.

The obsolete `frequency`/`interval`/`strategy`/`on` mapping is invalid
immediately. Parsing retains the complete opaque YAML block and emits a
`legacy-repeat` diagnostic. Unrelated Task edits serialize it unchanged;
recurrence editing must explicitly replace or remove it. Other invalid repeat
or tracking blocks receive the same non-destructive treatment.

## Library execution boundary

`RecurrenceEngine` is the only package recurrence calculator. It wraps pinned
`rrule@2.8.1` with date-only `next`, `previous`, and `between` methods and
composes `RRuleSet` for DTSTART, RDATE, and EXDATE.

Tasks executes only:

- `FREQ=DAILY`, `WEEKLY`, `MONTHLY`, or `YEARLY`
- `INTERVAL`, `BYDAY`, `BYMONTHDAY`, `BYMONTH`, and `BYSETPOS`
- `WKST`, `COUNT`, and date-only `UNTIL`

A syntactically valid library rule outside that subset remains a normal
`TaskRepeat`, retains its raw RRULE, and emits `unsupported-repeat-rule`.
Planner surfaces keep its current-plan visibility, but completion, skip, and
automatic advancement fail closed until the user replaces it. Invalid rules
remain opaque rather than becoming one-off Tasks.

rrule.js documents that it omits a DTSTART that does not match BY rules, unlike
the RFC recurrence-set model. The adapter adds `start` as an RDATE so it is the
first instance, then lets EXDATE remove it when explicitly excluded. Calendar
month and year rules use the library: January 31 skips months without day 31,
and February 29 yearly recurrence lands on later leap years rather than adding
365 days.

## Effective occurrence policy

Schedule/carry retains the rolling plan date until completion or explicit
skip. A date before local today resolves `overdue` and belongs to Review.

Schedule/skip resolves the first library occurrence on or after local today.
Several offline days therefore change only disposable effective fields; they
do not cause midnight or startup Task writes and do not create observations.

Completion anchoring always carries. On first completion it may persist the
action's local date as `start`; subsequent next dates come from the library
after the local completion date. When no next occurrence exists, completion or
skip clears the active plan, keeps the Task open, and projects `exhausted`.

Pause begins on the action's local date. Resume closes an inclusive range from
`pausedSince` through the day before resume, discards any pre-pause carry
backlog, and selects the first non-paused library occurrence on or after the
resume date. Paused dates are excluded from history expectations and
statistics denominators.

## Completion and skip lifecycle

Recurring completion is one guarded transaction after any required daily
observation write:

1. Reject invalid, unsupported, paused, future, or exhausted recurrence.
2. Keep `status: open`, clear terminal completion state, and clear inbox.
3. Advance the active plan with `RecurrenceEngine`, or clear it on exhaustion.
4. Persist `lastCompletedAt` and increment `completionCount`.
5. Reset lightweight checklist markers only when `resetChecklist` is true.

Explicit skip ensures an unchecked daily observation, then advances from the
effective occurrence without writing completion metadata or resetting the
checklist. The Task stays open. Automatic skip-policy rollover does not write
Task Markdown and leaves elapsed dates unrecorded.

## Tracking schema

Tracking requires recurrence in this release:

```yaml
task:
  tracking:
    type: count
    unit: glasses
    target: 8
```

| Type | Fields | Completion input |
| --- | --- | --- |
| `boolean` | no additional fields | direct check-off |
| `count` | required `unit`, optional positive numeric `target` | numeric value |
| `duration` | optional positive duration `target` | duration |
| `number` | required `unit`, optional positive numeric `target` | numeric value |

Canceling a quantitative prompt makes no change. Confirmation validates and
writes the idempotent daily observation before advancing the Task. Statistics
derive from expected dates plus observations; targets and lifecycle metadata
are not aggregate counters.

## Recurrence editor

The recurrence Command View provides Daily, Weekly, Every 2 weeks, Monthly,
and Yearly presets plus Advanced raw RRULE editing. Structured controls own
interval, selected weekdays, monthly positional rules, COUNT/UNTIL end
conditions, anchor, missed policy, checklist reset, RDATE/EXDATE, pause, and
tracking. Completion anchoring disables skip policy. Applying any schedule
preset persists its calendar start; choosing recurrence for an unplanned Task
also writes that date as canonical Anytime plan context.

Unsupported and invalid rules remain visibly selected with an actionable
warning. Opening and dismissing the editor does not normalize, remove, or
execute them.

## Daily outcomes and statistics

The app provider locates one canonical `type: daily-note`, `date: YYYY-MM-DD`
document. Tasks materializes at most one exact list item for
`taskId + occurrenceDate` under `## Tasks` and the configured day section.
Boolean observations are unchecked/checked Task links. Quantitative entries
start unchecked and complete as readable `: value unit` or `: duration` lines;
indented context remains untouched.

An unchecked current or overdue-carry observation is pending. It becomes
missed after explicit skip or skip-policy expiry. An elapsed expected date with
no observation is unrecorded. Historical views merge RRULE expectations with
indexed `tasks/occurrence` rows and distinguish completed, missed, and
unrecorded outcomes without reopening daily files.

Current/longest streak, completion rate, period totals, averages, and latest
completion are derived. Past missed and unrecorded outcomes break streaks;
current pending does not. Pause ranges and recurrence exceptions do not enter
the denominator.
