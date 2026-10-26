# Native Task lifecycle planning

This private source slice reuses the qualified document, recurrence, mutation
and observation functions. Notes retains application provider selection,
checked persistence, accepted lifetime and recovery.

## Requirements

| ID          | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LN-TASK-092 | A private native lifecycle planner MUST preserve the retained Task repository's complete/skip replacement and optional observation intent from explicit authored bytes, local date, timestamp, tracking value and day-part settings. It MUST establish a missing completion origin before choosing the observation date, preserve tracked-completion versus skip distinctions, and retain source errors. It MUST NOT read a clock, resolve a provider, write files, publish projections or start a scheduler. |
| LN-TASK-093 | Native lifecycle acceptance MUST compare complete planner outputs and source errors against frozen captures from the unchanged Task and occurrence repositories. Captures MUST retain full attempted and persisted Markdown, source observations, errors, write order and partial-failure retries. Existing qualified fixture bytes MUST remain unchanged. Source qualification MUST NOT imply native provider, persistence, recovery or host acceptance.                                                     |

## Retained lifecycle authority

`TaskRepository.complete` first derives the complete Task replacement. Only a
recurring Task with tracking requests an observation. Completion-origin repeat
metadata without a start uses the explicit local date with carry behavior while
resolving that observation. The current Task's plan and tracking determine its
readable daily item; the replacement plan must not replace those inputs.

`TaskRepository.skip` first derives its replacement. Any recurring Task requests
an unchecked observation when its effective occurrence has a date, including
untracked recurrence. The occurrence repository combines materialization and
optional completion inside one daily document operation. It ensures the daily
target before processing; quantitative validation and stale/duplicate checks
retain their existing placement and errors.

The source reference invokes the actual repository methods, not a replacement
implementation. Transparent spies retain the pure replacement and observation
inputs while forwarding unchanged arguments and results. Captured persistence
intents preserve call order and distinguish attempted writes from retained
files after an injected failure. A failed second write leaves the first daily
observation readable; retry reuses its task/date identity.

## Notes application boundary

The pure native plan returns the exact Task replacement and an optional daily
observation intent. It grants no persistence authority. Notes must select the
native provider, validate both physical paths and revisions, process daily bytes
before advancing the Task, retain partial-write outcomes, and recover without
replaying an uncertain write. Tracked-today scheduling belongs to the existing
admitted native application owner; this crate adds no timer or writer.

Before that application scheduling intake, a separate frozen reference invokes
the unchanged plugin's tracked-today method with its real Task and occurrence
repositories. It retains full daily bytes, observations and unchanged Tasks for
current tracking kinds, excluded effective/status states, same-date refresh,
local-date rollover and existing authored daily paths. This reference grants no
native scheduler selection or application writer authority.

## Valid duration source acceptance

A separate retained corpus MUST cover authored duration tracking through the
source-owned `target` string, including complete/skip, recurrence anchors,
ordinary and unavailable occurrences, and missing/invalid completion values.
The prior `targetMinutes` traces MUST remain byte-preserved as normalization
observations; their no-tracking result MUST NOT qualify valid duration capture.
Capture MUST retain complete repository attempts and planner results before
native application intake; it grants no new writer or scheduler authority.
