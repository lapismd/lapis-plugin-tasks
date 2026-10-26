# Native Task lifecycle planning

This private source slice reuses the qualified document, recurrence, mutation
and observation functions. Notes retains application provider selection,
checked persistence, accepted lifetime and recovery.

## Requirements

| ID          | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LN-TASK-092 | A private native lifecycle planner MUST preserve the retained Task repository's complete/skip replacement and optional observation intent from explicit authored bytes, local date, timestamp, tracking value and day-part settings. It MUST establish a missing completion origin before choosing the observation date, preserve tracked-completion versus skip distinctions, and retain source errors. It MUST NOT read a clock, resolve a provider, write files, publish projections or start a scheduler.                                                                                                                                                                                         |
| LN-TASK-093 | Native lifecycle acceptance MUST compare complete planner outputs and source errors against frozen captures from the unchanged Task and occurrence repositories. Captures MUST retain full attempted and persisted Markdown, source observations, errors, write order and partial-failure retries. Existing qualified fixture bytes MUST remain unchanged. Source qualification MUST NOT imply native provider, persistence, recovery or host acceptance.                                                                                                                                                                                                                                             |
| LN-TASK-094 | The explicitly selected native adapter MUST send bounded typed actions through its owning App's admitted Tasks port. It MUST reuse the qualified native writer and complete/skip journal, preserve returned errors and partial outcomes, and never retry an uncertain call or fall back to a TypeScript mutation. The existing standalone browser repository MUST retain its implementation.                                                                                                                                                                                                                                                                                                          |
| LN-TASK-095 | A Tasks plugin using the admitted native port MUST retain its existing views while observing native Task projections and tracked-today materialization. It MUST NOT run renderer projection repair, a competing day-change timer or daily materialization. Explicit disable MUST fence native admissions; passive App teardown MUST release observation without stopping accepted work.                                                                                                                                                                                                                                                                                                               |
| LN-TASK-096 | An uncertain native lifecycle failure MUST present its submitted request ID and the existing Tasks inspection command through the planner error surface. Before native admission, the plugin MUST persist a bounded request reference through its existing plugin-data writer. Reload and cold recovery MUST retain unresolved identities. Inspection MUST be read-only, distinguish journal results from current file bytes and offer current Task/daily navigation. Capacity MUST refuse new work without evicting unresolved references. The adapter MUST preserve the original error identity, known failure code/parts and partial operation. It MUST NOT retry or replace an unknown operation. |
| LN-TASK-097 | Native Task writes MUST use the existing App editing registry guard through source re-read, native admission and editor rearm. Single-file mutations MUST use their path; daily/lifecycle/retry operations MUST guard all files. Recovery-reference persistence MUST stay outside that guard. A local flush or guard refusal MUST NOT be classified as an uncertain native admission. Read-only inspection MUST NOT yield editors.                                                                                                                                                                                                                                                                    |

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

## Native Task action adapter

<a id="ln-task-094"></a>

The admitted native port adds no transformation engine or writer here. The
existing repository delegates its supported actions and retains native known
failure/partial status or an uncertain request identity. Application hosts own
actual signed-bundle and native-screen acceptance.

## Native scheduling ownership

<a id="ln-task-095"></a>

The existing Task planner observes the native projections when selected.
Standalone browser repositories retain their own explicit implementation.

## Default daily locale qualification

The [English daily context source gate](../../../../records/2026-10-26-native-daily-contexts.md) qualifies only current en-US week 7/4, declared legacy Intl en-US week 7/1 and en-GB week 1/4 through complete retained filename/provider/registry outcomes and physical default-provider IO. The selected adapter admits only these English Gregorian/Latin-number contexts. Custom or ambiguous providers remain explicitly unavailable; there is no transport or renderer formatting fallback. Actual host timezone/day-boundary and installed-bundle acceptance remain separate.

## Uncertain lifecycle presentation

<a id="ln-task-096"></a>

The native adapter preserves the original thrown error and its typed metadata.
For uncertain submission results, its readable message includes the submitted
request identity and the Tasks: Inspect interrupted task update command. The
existing public command/menu and notification components expose read-only journal
inspection and current-file navigation. The message distinguishes a recorded
result from current files; absence of a journal record never authorizes replay.
Known admission and domain failures retain their original message.

The existing plugin data stores only request/path/action/time inspection
references, never replacement bytes or authoritative outcomes. A reference is
persisted before native admission and outside any editing registry guard. A
successful observed result clears its reference; failed cleanup safely retains
it. Unknown results survive reload/cold recovery until explicit inspection and
forgetting. The bounded store refuses new work at capacity instead of evicting
unresolved identities. Settings writes preserve references. This adds no custom
recovery screen, retry, fallback or native operation authority.

## Editing registry handoff

<a id="ln-task-097"></a>

The native adapter uses the App-owned guard directly. Existing editor flush and
native intent yield/rearm stay in the API registry; the plugin adds no claim
manager, save path or clean-as-dirty state. Native source versions are read after
flush while the guard remains held. Lifecycle references persist before the
guard and clear after it returns, avoiding re-entering the same writer queue.
Local refusals precede native admission; only a submitted operation can become
an unknown outcome. Actual hosted/Desktop editor acceptance is a separate gate.
