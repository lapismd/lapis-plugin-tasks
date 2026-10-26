# Retained tracked-today application reference

Status: retained capture, frozen replay and complete source gates qualified.
Last updated: 2026-10-26 04:31:00 UTC. Requirement: LN-TASK-093.

Source base: `da17eba0c7d9a6c90056cb957ef88fb60b975a43`. This slice changes
test/specification files only. It does not change Tasks runtime or native
algorithms, previous corpora, package boundaries or application selection.

The capture invokes the unchanged `TasksPlugin.materializeTrackedToday` method
with the real Task and occurrence repositories. Only their file/daily IO and
explicit date are injected. Fifteen scenarios retain complete daily Markdown,
observations, call order and unchanged Task sources over 45 attempts: initial
day, repeated same-day refresh and local-date rollover. They cover all tracking
kinds, current versus excluded effective/status states, ordinary/untracked
Tasks, inbox recurrence, uppercase Markdown and an authored daily at another
path. Existing default-provider lookup is independently qualified by Notes;
this reference records the selected target and full repository mutation.

Capture command: `pnpm capture:native-lifecycle-reference -- -t 'tracked today'`.
It writes only the new candidate under ignored `test-results/`; frozen fixture
acceptance uses the ordinary same target without capture. Notes must freeze
these bytes before implementing native tracked-today scheduling. Source replay
does not qualify Notes physical authority, lifetime, provider availability,
guards or either host's native Task selection.

The initial capture `6d65a8d5-c38e-408a-9c1f-a581ff3a1a34` stopped before
runtime cases because importing the complete Plugin class in Node reached an
unrelated legacy API icon JSON import without an import attribute. The fixture
now keeps only unused plugin inheritance and UI registrations inert. The actual
plugin method body, normalization, query and occurrence repositories remain
unchanged and execute normally.

Capture `b477e6b3-ca5e-4db7-9735-686ead6dbb57` passes all 15 scenarios / 45
attempts. Six scenarios materialize one observation on each selected day;
nine excluded scenarios perform no daily writes. The candidate is frozen
byte-for-byte as `crates/lapis-task-services/tests/fixtures/tracked-today.json`,
SHA-256 `1f2133e948ef8827349a981a09c491871e0a02dbcdbba6fb440334d4a1b2d0eb`.
Ordinary frozen replay passes at `1dc2350e-2972-4318-ad66-e9e9a1d6b74b`.
Both exact targets report one passing capture/replay case and two deliberately
unselected lifecycle cases. Existing lifecycle and duration corpora are intact.

Full `pnpm validation:all` at `15d785bb-867c-4d18-ad1a-d9f943c826f5` passes
strict checks, all 26 native cases, all 2,850 unit cases, package build/publint,
static Storybook and all 62 cold interaction/accessibility cases. Its final
spec-first step found two missing mapped routing chapters. Updating the
existing index/runtime routes fixes those documentation omissions; no runtime,
assertion or frozen fixture changes follow the complete passing product gate.

Final `pnpm spec:check` passes all routing/composition, canonical validation,
mdBook, spec-first and App ownership gates at
`f565a0fc-b454-4973-83a8-0a50d2d95221`. There are no remaining functional,
interaction, accessibility or canonical failures. This source-only oracle does
not select native Notes scheduling or either host. Its test-only additions do
not require a new native Tasks dependency pin or published package revision.
