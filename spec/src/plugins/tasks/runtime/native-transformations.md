# Native transformations

Status: implemented pure native value contract; source parity is qualified.
The user approved these pure exports and DTOs before implementation. Neither
application selects these transformations. Existing read-only exports and frozen
corpora remain intact. The separately qualified YAML reader prerequisite is
`9131b27d` (LN-TASK-090).
Priority presence is qualified separately in `2cfcdc59` (LN-TASK-091).

## Requirements

| ID | Requirement |
| --- | --- |
| LN-TASK-086 | Native Task mutations MUST receive complete authored Markdown, its vault-relative path and explicit action values. They MUST return replacement Markdown or the retained error without filesystem, database, wall-clock, App or host access. They MUST NOT acquire write authority or select a host provider. |
| LN-TASK-087 | Native Task mutation results MUST retain the existing TypeScript action, recurrence, lifecycle, checklist and serialization behavior, including optional-field absence, opaque metadata, exact UTF-16 preconditions and error identity. Returned replacement Markdown MUST match the complete retained output; a normalized parse alone MUST NOT qualify serialization parity. |
| LN-TASK-088 | Native daily-observation transformations MUST retain canonical-date checks, section placement, escaped labels and hrefs, identity idempotence, duplicate rejection, completion validation, contextual Markdown and stale UTF-16 range checks. They MUST return replacement text without creating daily files or scheduling materialization. |
| LN-TASK-089 | Source acceptance MUST compare full output text, parsed snapshots, observations and retained errors against frozen results from unchanged TypeScript. It MUST preserve the qualified read-only source and corpora, record exact before/after failures and complete owner gates, and distinguish source parity from guarded host writes, scheduling and application adoption. |

## Native surface

These approved signatures are the bounded implementation contract. They belong to
the private `lapis-task-services` crate. No npm, HTTP, Tauri or configuration API
changes are proposed by this source slice.

```rust
fn apply_task_mutation(
    raw: &str,
    path: &str,
    mutation: &TaskMutation,
) -> Result<String, TaskTransformError>;

fn scan_task_occurrence_observations(
    raw: &str,
    daily_path: &str,
) -> Vec<TaskOccurrenceObservation>;

fn materialize_task_occurrence(
    raw: &str,
    daily_path: &str,
    input: &TaskOccurrenceMaterialization,
) -> Result<String, TaskTransformError>;

fn complete_task_occurrence(
    raw: &str,
    daily_path: &str,
    expected: &TaskOccurrenceObservation,
    completion: &TaskOccurrenceCompletion,
) -> Result<String, TaskTransformError>;

fn tracking_completion(
    tracking: Option<&TaskTracking>,
    value: Option<f64>,
) -> Result<TaskOccurrenceCompletion, TaskTransformError>;

fn task_occurrence_day_part(
    plan: Option<&TaskPlan>,
    settings: &TaskDayPartSettings,
) -> TaskOccurrenceDayPart;
```

`apply_task_mutation` composes the qualified parser, one retained action and the
retained serializer. Internal tests additionally compare the full mutated
document snapshot; no public mutable document or callback is necessary.

## Value types

All strings and values are supplied by the caller. These are Rust value types,
not a new transport schema. Public visibility is approved for exactly this pure source surface.

```rust
enum TaskMutation {
    Checklist { position: f64, expected_text: String, checked: bool },
    Complete { at: String, local_date: Option<String> },
    Skip { at: String, local_date: Option<String> },
    Plan { plan: Option<TaskPlan>, at: String },
    Start { start: TaskStart, at: String },
    Deadline { deadline: Option<String>, at: String },
    Inbox { inbox: bool, at: String },
    Repeat { repeat: Option<TaskRepeat>, at: String },
    Tracking { tracking: Option<TaskTracking>, at: String },
    Pause { at: String, local_date: Option<String> },
    Resume { at: String, local_date: Option<String> },
    Cancel { at: String },
    Reopen { at: String },
}

enum TaskStart { Anytime, Someday, Date { date: String } }
enum TaskPlanAt { Anytime, Morning, Afternoon, Evening, Time }
struct TaskPlan {
    date: String,
    at: TaskPlanAt,
    time: Option<String>,
    duration: Option<String>,
    duration_minutes: Option<f64>,
}
enum TaskRepeatAnchor { Schedule, Completion }
enum TaskRepeatMissed { Carry, Skip }
struct TaskPauseRange { start: String, end: String }
struct TaskRepeat {
    start: Option<String>,
    rrule: String,
    anchor: TaskRepeatAnchor,
    missed: TaskRepeatMissed,
    rdate: Option<Vec<String>>,
    exdate: Option<Vec<String>>,
    reset_checklist: Option<bool>,
    paused: Option<bool>,
    paused_since: Option<String>,
    pause_ranges: Option<Vec<TaskPauseRange>>,
    last_completed_at: Option<String>,
    completion_count: Option<f64>,
}
enum TaskTracking {
    Boolean,
    Count { unit: String, target: Option<f64> },
    Duration { target: Option<String> },
    Number { unit: String, target: Option<f64> },
}
enum TaskOccurrenceDayPart { Anytime, Morning, Afternoon, Evening }
struct TaskDayPartSettings {
    afternoon_starts_at: String,
    evening_starts_at: String,
}
struct TaskOccurrenceMaterialization {
    task_id: String,
    task_path: String,
    title: String,
    occurrence_date: String,
    tracking: Option<TaskTracking>,
    day_part: TaskOccurrenceDayPart,
}
enum TaskOccurrenceCompletion {
    Boolean,
    Count { value: f64, unit: String },
    Duration { duration_minutes: f64 },
    Number { value: f64, unit: String },
}
struct TaskOccurrenceObservation {
    record: TaskOccurrenceRecord,
    checked: bool,
    title: String,
    href: String,
    day_part: TaskOccurrenceDayPart,
    source: String,
}
struct TaskTransformError {
    name: String,
    code: Option<String>,
    message: String,
    parts: Option<Vec<String>>,
}
```

Observation serialization flattens `record`, retaining the existing camel-case
fields and UTF-16 source ranges. Missing optional fields stay absent; false,
zero and explicit empty arrays remain distinguishable from omission. A mutation
variant with an absent patch explicitly clears that supported field; choosing
another variant leaves it untouched. Checklist positions and quantitative
values retain the TypeScript numeric domain so invalid finite numbers produce
the retained semantic error instead of a different integer-decoding error.

`at` remains authored action text. An absent `local_date` retains the existing
`at.slice(0, 10)` fallback; no wall clock or implicit timezone conversion is
introduced. Existing `RepeatOptions` is not a write DTO: it omits anchor and
lifecycle fields and normalizes distinctions needed by serialization.

Write DTO fields have their declared order. The TypeScript reference adapter
constructs replacement repeat objects in that same order before calling the
unchanged mutation. Incidental JSON property order is not an additional native
input. Existing parsed metadata, opaque fields and subsequent lifecycle-property
insertion retain the original serializer order.

The observation scanner exposes the existing record plus its retained source
text and context. It does not deduplicate identities. Materialization/completion
perform the retained uniqueness and stale checks and preserve error name,
optional code, message and recurrence parts when present.

## Oracle and acceptance boundary

The retained source is `task-mutations.ts`, `task-occurrence.ts`, the qualified
parser/recurrence dependencies and the day-part helper in
`task-occurrence-repository.ts`. Source capture invokes those functions directly;
it must not reimplement their rules or infer expected Markdown from Rust.

Capture compares transformed in-memory snapshots, exact serialized text, its
fresh parse, complete observations, repeated-application results and errors.
Inputs cover all 13 actions, recurrence states and lifecycle distinctions,
opaque/unknown metadata, LF/CRLF/astral ranges, daily section placement and
canonical-date rejection, identity duplicates, stale contexts, all tracking
types and quantitative validation. Existing qualification fixtures stay byte
identical. Capture is authoring, not evidence of a native pass.

Private tests and corpus authoring precede native implementation. Complete
source qualification follows the frozen oracle. Existing read-only exports
remain byte-preserved; only the explicitly approved pure exports may be added. No host automatically invokes a transformation during indexing.

## Later Notes integration

Notes retains vault admission, exact-current-byte checks, dirty editor handling,
conditional writes, accepted-operation receipts and uncertain-outcome recovery.
Its existing file service executes a returned replacement; this crate never
writes a path or publishes derived database records.

Daily document creation and the order of daily-observation and rolling Task
writes remain application coordination. Explicit host/plugin admission and one
native lifetime owner must precede replacing `materializeTrackedToday` or its
renderer clock. Retries must preserve the retained identity behavior without
automatically replaying an uncertain native write. Standalone Web keeps its
explicit browser implementation. Both application adoption gates remain open.
