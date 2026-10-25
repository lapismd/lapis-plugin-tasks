# Docker validation and Storybook composition

Last updated: 2026-10-25 19:54:03 UTC.

Status: complete. Final exact, affected and complete acceptance plus committed
source admission are recorded in the [final intake](2026-10-25-docker-final-intake.md).
Earlier pending statements below describe their recorded attempt, not current gates.

## Scope

This slice makes portable validation Docker-first and adds a source audit of
the selected CSF-Svelte render path. It does not activate the native occurrence
parser in a host, approve visual baselines, publish packages, or qualify native
desktop behavior. The private parser remains the unchanged parent slice
`569d7e30ed86bd4514365e50befb908b2a8400e2`.

The runner transfers the exact tracked Jujutsu revision and ancestry, verifies
its source pack, installs from the registry lock, and records tools, resources,
arguments, outputs and combined logs. It never mounts host dependencies, source
or a Docker socket. Docker failure has no native fallback. Explicit native
diagnosis is available; host package lifecycle commands require that selection
because collected Linux output does not update the host `dist` directory.
Standalone `publint` builds its own Svelte package prerequisite, since workers
do not inherit an earlier lane's `dist` directory.

Each worker has a per-checkout remote lease and defaults to 4 CPUs, 12 GiB RAM
and 2 GiB shared memory. The current acceptance uses the `omarchy` Docker
context with SSH CLI transport. Failed workers remain inspectable. Cleanup
collects reports before removing stopped workers owned by this checkout.
Active or unknown worker state retains the lease. Cleanup distinguishes
exited/dead workers from preparing/paused workers and releases leases by
container ID only after completion evidence and a successful no-active-worker
query. This preserves serialization after a lost SSH connection.

The image pins Rust 1.99.0, the qualified base digest, Jujutsu 0.45.1, mdBook
0.5.4 and pnpm 10.32.1. Chromium is installed for locked Playwright 1.62.1.
CI installs only pinned Jujutsu on its host and transfers the exact CI commit
to the same Docker path. Browser acceptance is bounded to one worker with three
fresh sequential shards unless explicit selectors were supplied.
Image identity now includes only the actual recipe/installer and selected tools
and architecture. Script or unrelated dependency edits retain the image. pnpm
dependency and Rust cache identities are separate, with archive/lock changes
affecting dependency cache and Cargo/recipe changes affecting native cache.
Two new exact identity cases failed before those helpers existed; both pass in
the current 29-case suite. An unproved async/raw-HTML story branch case also
failed before the guard was strengthened, and now passes.

The story inventory covers 23 families. Application coverage reaches exactly
one public `WorkspaceShell`; component coverage names its actual rendered
subject. The guard rejects stale or missing declarations, unused imports,
unproved dynamic replacements, private production overrides and unisolated
synthetic controls. A visible labelled, padded, dotted fixture boundary now
contains the checklist external-edit setup action. Application fixtures require
overlay placement; focused component fixtures may use inline placement.

## Before and after

| Boundary                                   | Before                                                    | Current result                                        |
| ------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------- |
| New model and composition regression files | Missing modules; two suites failed to collect, zero cases | Final focused suite: 29 cases pass                    |
| Story inventory classification             | One AppShell identity finding                             | Correct public `AppShell.Root` subject; zero findings |
| Synthetic checklist setup                  | Two unisolated-control findings                           | Fixture boundary added; browser acceptance pending    |
| Helper extraction regression               | Three cases failed with missing `attribute` import        | Import restored; all 24 initial cases pass            |
| Docker bootstrap                           | Not available                                             | Exact snapshot and frozen registry install pass       |
| Real headless browser                      | Not available                                             | Chromium 151.0.7922.34 smoke passes                   |
| Standalone Docker publint                  | Six missing-dist export errors                            | Lane builds its own package; exact rerun passes       |

Two additional worker-uncertainty policy cases initially failed before their
helpers existed; that stage passed all 26 cases. A real
ignored SSH probe deliberately made the final worker-state query unavailable:
26 Docker cases passed, its lease stayed retained, and a following run failed
at lease acquisition. Normal cleanup preview identified only the finished owned
lease and the prior stopped publint-baseline worker. Apply recollected that
worker and released the finished lease. The probe report suffix is
`d13872ae-66ee-42d0-a55e-805c83924a76`. Its initial local probe launcher failed
before Docker because it used CommonJS under this ESM package; changing that
ignored launcher to ESM enabled the intended probe. No product assertion was
weakened.

## Recorded commands

- `LAPIS_TASKS_VALIDATION_RUNTIME=native pnpm validation:check`: 24 cases pass.
- `LAPIS_TASKS_VALIDATION_RUNTIME=native pnpm check:storybook-parity`: 23
  families, zero findings before the latest label-strengthening check.
- `LAPIS_TASKS_VALIDATION_RUNTIME=native pnpm spec:validate`: nine validators,
  12 chapters and 88 requirements pass before dependency refresh.
- `pnpm validation:images`: pinned image built successfully on remote Docker.
- `pnpm validation:check`: 24 cases pass after a frozen registry-only install.
  The refreshed registry cohort also passes this focused lane. Report suffixes
  are `698d1e1b-9932-4ad0-981f-3ca23e057841` and
  `977e9560-bddb-4302-8b39-ae27cb2da849`.
- `pnpm validation:smoke`: headless browser interaction passes after a frozen
  registry install; report suffix `6403b1c4-056c-4fc0-bee3-9d1533394f5e`.
- Intentional failure probe `pnpm validation:check --
--definitely-unsupported-validation-flag`: exits one, retains a failed
  report and its stopped worker, and releases the checkout lease. This is an
  expected infrastructure probe, not a product regression. The report suffix
  is `1235ecc2-c1d1-471f-b912-bc7126a52cef`.
- `pnpm validation:clean` previews exactly that stopped owned worker;
  `pnpm validation:clean -- --apply` recollects its report and removes it.
- `pnpm test:native`: two native occurrence tests pass on Linux after a locked
  Cargo install/build; report suffix `50df576e-47d5-4994-b05d-abb0968ce654`.
- `pnpm publint`: fresh-worker baseline fails with six missing-dist export
  errors; its lane now builds the package first. The exact standalone Docker
  rerun passes; report suffix `495389d1-b738-4515-97fd-6c95b7b5c01b`.

Reports live under ignored `.local/validation/runs/lapis-tasks-run-<suffix>/`.
Each contains source and parent IDs plus the exact selected dependency inputs.

- `pnpm spec:check`: routing, story composition, canonical validation,
  spec-first, mdBook and one App-ownership case pass from a registry-only
  Docker worker; report suffix `75df6919-9b31-4383-8bab-4ae2c0835c55`.

## Dependency refresh

Tracked development pins and compatible public peer minima move to the current
cohort: API 0.1.4, UI 0.1.3, Workspace 0.2.1, File Explorer 0.1.2, Markdown
0.1.6, Search 0.1.3, Design Core 0.6.0 and Mira 0.1.1. Svelte and its singleton
override align to 5.56.10, matching the source Notes API peer contract. Mira
remains development only. The manifest and regenerated lock retain registry
packages.

Current source contracts may be qualified with an explicit ignored archive
inventory. Archives keep their real package versions and SHA-256 identity;
none are relabelled as older versions. Notes source packages come from
`dcba70cd`; Markdown, Search and Source Editor come from `99806c68`. The four
Mira archives are registry-verified 0.1.1/0.0.3 companions. Final source Design
Core acceptance is pending its separately owned autocomplete repair. Complete
catalog acceptance will use that final cohort once qualified.

The registry install reports existing older dependency peer declarations in
the released API/UI cohort, including Design Core, Mira and DnD ranges. The
temporary source acceptance must remain distinct from registry-only smoke.

## Source cohort progress

The Linux permission probe exposed one real worker-environment failure: a
root worker with default capabilities could write inside a mode-0500 directory.
Worker arguments now include `--init` and `--cap-drop=ALL`, covered by the
existing routing regression. Its targeted test first failed while the argument
builder was missing, then all 29 tooling cases passed. The exact Docker smoke
now proves a denied write, a non-PID-1 Node worker and real Chromium interaction
without weakening product permission assertions. Baseline report suffix:
`3c079d11-5ac8-4541-b353-5bb99dd8d2b1`; repaired report suffix:
`2856e1e9-ae4e-470b-890d-180b96651256`.

The explicit native read-only registry-lock audit
`LAPIS_TASKS_VALIDATION_RUNTIME=native pnpm audit --prod --audit-level=low --json`
initially returned eight advisories (four high, three moderate, one low), all
for `devalue` 5.9.0 through Svelte. The parent parser revision also locked that
version. Svelte 5.56.10 declares `^5.8.1`, so a targeted compatible lock refresh
selects 5.9.4. The final audit has zero findings at every severity. Importers
and manifests are unchanged by that repair; an unrelated Babel patch introduced
by the update command was removed. Reports remain in ignored
`.local/validation/refreshed-runtime-audit{,-after}.json`. The earlier parser
audit acceptance has not been reused for this slice.

The source cohort before the final Design Core repair contains the five current
Notes archives, three current Markdown/Search/Source Editor archives and the
four registry-verified Mira companions. Design Core 0.6.0 remains registry-only
for these non-browser checks.

| Command                                                                             | Result                                                                                                                     | Report suffix                          |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `LAPIS_TASKS_VALIDATION_ARCHIVES=.local/validation/cohort-archives.json pnpm check` | Routing/parity/spec, App ownership, no-Tailwind, Svelte (zero errors/warnings), TypeScript, strict Clippy and rustfmt pass | `f070549c-0462-4d30-b600-0eac34ac5dd9` |
| `LAPIS_TASKS_VALIDATION_ARCHIVES=.local/validation/cohort-archives.json pnpm test`  | All 258 unit cases in 40 files and two native tests pass                                                                   | `57270ed4-89f0-441e-8de7-23bfe1b7364d` |
| `LAPIS_TASKS_VALIDATION_ARCHIVES=.local/validation/cohort-archives.json pnpm build` | Locked native build, Svelte package and publint pass; Rust cache reuses compiled dependencies                              | `cec643e0-e763-491a-a354-4ec290f96e88` |
| `pnpm validation:check` after image/cache separation                                | All 29 cases pass under the actual new image and both separated cache volumes                                              | `562eaa78-70e4-4992-80be-bedfed5a0575` |

After the capability/init changes and compatible devalue security refresh,
the complete source-cohort unit/native lane was rerun: all 258 cases in 40
files plus two native tests pass again. Report suffix:
`fe98d007-9b2f-409c-9b1c-0f52f8d5f3db`. The complete check lane also passes
again with zero Svelte errors/warnings, strict Clippy and formatting after those
final runner/security changes; report suffix
`fc195eb1-d21b-4a7a-9bbd-c487791ef593`.

Final cold affected stories, complete interaction/accessibility and static
Storybook acceptance will use the repaired Design Core source archive. Those
browser lanes have deliberately not been run against the obsolete cohort.

## Provisional final-cohort browser intake

The audited Design Core 0.6.0 candidate comes from source `8940d1af` with
SHA-256 `4f8adef133571b72280c9bac78cc901a670d9f1fe0b47e8a70f3b6102053bd09`.
The owning source browser gate and final byte-equality admission are pending.
No package release is implied. The ignored cohort now includes this thirteenth
archive; final commit remains held until its source gate passes.

The initial human-readable test-name pattern matched no CSF-generated exported
names: zero executed and nine skipped (`8e64d325-4af5-4e99-9997-825870df71b4`).
The corrected literal `checklist|Checklist` pattern executes both changed cases:
two pass, seven deliberately skipped, from a fresh worker/browser
(`e77bc17d-feab-4ddd-adcc-379bc0e873c0`). This proves the visible fixture boundary
and retained rollback behavior; the zero-case run is not counted as acceptance.

The complete catalog stopped at the first shard with 13 passes and one failure
(`43851615-5270-4355-a0bd-1512e23b01e1`). `ConstrainedTodayRowSpacing` passes cold
alone (`794e6705-c149-430e-a536-602771ba571c`) but the complete three-case Planner
Mode family reproduces one failure after `LogbookHeaderActions`
(`4c948a06-3618-4c8e-b9d0-37c698efa2c7`). The Logbook play ended before its menu
released the body pointer lock. It now asserts menu closure and pointer release
before completion; the exact cold family now passes all three cases
(`a388c8ca-1d00-4a13-a29f-a0dc078425ec`). No pointer guard, geometry assertion
or production styling is bypassed.

The next full attempt passes all 14 first-shard cases; its second shard reports
six passes and two failures, then stops (`d9501a3d-3b59-4b90-afed-0e0eb960acc8`).
`ApplicationPlannerTaskRow > SampleRow` asserts schedule-dialog visibility before
it becomes visible. `ApplicationTaskPlannerColumnCanvas > NavigationStates`
selects an old, closed ending-style tooltip instead of the current Today count.
The third shard has not run. These findings remain functional gates.

The owning repository replaced the first candidate after a separate Desktop
Autocomplete regression. The new audited 0.6.0 archive is SHA-256
`4f6b3f5c6c619e3154cb2860881b7d89b9c11062db4cfa1eb9ae0488150b7a97`,
public source pin `3bcbae3fcc9e8bfbf75371117b74ceb11173381a`. Provisional Tasks
qualification is authorized; exact two-case reruns are waiting for the bounded
remote resource slot. Final source gates/byte equality still precede admission.

The replacement archive reproduces both exact cases from a fresh worker:
zero passes, two failures and two deliberately skipped cases
(`4e01b140-d25a-471d-b8e6-3eae9e5655cd`). The row play now waits for each
dialog's actual visibility and closure before continuing, including pointer
release after dismissal. Navigation selects only active tooltip content and
checks its Today label/count inside the readiness wait. No production style,
timing budget or existing assertion is relaxed.

## Fatal runtime diagnostics remain open

The exact two interaction assertions pass after the readiness repair
(`edb9bda3-8740-433a-a699-4a7e80d197b1`: two pass, two deliberately skipped).
That run still emits runtime `derived_inert` warnings and does not qualify
runtime health. The next four-family cold run reports 11 passes and five
failures in Preview Row metadata/recurrence interactions
(`4b02476a-9f4b-4341-ad17-ac62b1b50c0d`), plus 783 warning occurrences. No
remaining failure has been accepted or excluded.

Tasks lacked a fatal Svelte console guard. Its browser setup now installs the
reviewed Desktop guard before story hooks, preserves console output, initially threw
immediately and retained caught warnings for post-test/post-file assertions.
Separate regressions cover both console methods, caught teardown, ordinary
output, formatted URLs and preserving newer wrappers. There is no allowlist.

With that guard, cold `NavigationStates` now fails with one failed case, one
intentional skip and eight unhandled runtime errors
(`7f29c497-1aa8-42a8-8fd0-b3a8d13259c6`). The first complete stack runs through
Svelte `execute_derived`, `svelte-toolbelt`'s box getter and Bits UI 2.18.1's
`text-selection-layer` document `pointerdown` handler after popup destruction.
The full unsuppressed report is retained and shared with the Design Core owner.
Source/lifecycle diagnosis and another guarded exact run remain required.

The synchronous-throw guard was diagnostic only: interrupting framework cleanup
can amplify later callbacks. The final wrapper instead records each original
stack, allows cleanup to finish and fails post-test/post-file without suppression.
Its cold exact run still fails one Navigation case (one intentional skip), with
no unhandled runtime errors (`c5b97c10-6630-4fac-8cd2-6e0aaac18074`). The first
origin remains the Bits layer. Both Vite configurations dedupe Svelte, and the
tracked lock selects one Svelte 5.56.10 runtime; public routes have no Svelte alias.

Dependency inspection found Tasks's direct Bits UI pin at 2.18.1 while current
Design Core/Notes source use 2.19.5. An initial suspicion about the Notes UI
archive was disproven: the fresh qualified UI archive is byte-identical to the
existing SHA-256 `177bcce2…`, and both actual package manifests declare 2.19.5.
The owner retains its fresh source/public-equality receipt from `12d3f4a1` against
committed `16ab57a1`; Tasks takes that narrow UI receipt without changing bytes.

The Tasks direct import is only public `mergeProps`, used in production. Its
2.19.5 declaration now belongs to runtime dependencies. Only the existing direct
lock snapshot moved/advanced; registry package resolutions stay intact. The
dependency owner verified that 2.19.5 adds the exact destroyed-reference fences
in text-selection and dismissible layers. No dependency implementation,
node_modules or diagnostic allowlist was edited. Guarded consumer proof remains
required before attributing the failure conclusively.

Design Core source qualification is now admitted at committed
`944cd448b40d53be79624c2a453248af78e513e8`. Its owner proved all 1,557 public
inputs byte-identical to archive source `3bcbae3f`; SHA-256 stays
`4f6b3f5c6c619e3154cb2860881b7d89b9c11062db4cfa1eb9ae0488150b7a97`.
The owning complete checks pass; Tasks source-input/consumer gates stay separate.

The isolated Preview Row family independently reproduces four passes/five
failures, zero Svelte diagnostics (`344dc6f7-899f-4596-aea8-4fe5bd839448`). Its
first failure expects the obsolete accessible name `Task priority`, while the
current public control announces `Task priority: None`. Later cases also expose
popup readiness/dismissal ordering. These story-owned regressions remain open.

The exact guarded cold Navigation rerun now passes one case, with one deliberate
skip and zero Svelte diagnostics/unhandled errors
(`f8d7e30b-7087-4081-985c-26983ad27276`). This verifies the direct Tasks Bits
2.19.5 repair against unchanged Notes UI/Design Core public bytes. The final
Preview Row play now uses exact current selected-value accessible names and
waits for actual visible dialogs before interacting; full consumer gates remain.

## Complete directly affected interaction inventory

Preview Row's repaired family first reaches eight passes/one remaining old-label
failure (`353ea178-7c8d-4979-bcf8-aa65d30c18d8`), then the exact metadata case
passes with eight intentional skips (`3af127f2-a4a3-4fb6-8535-03e9d5bc07b4`).
The intermediate exact metadata run also retained the obsolete status-label
failure (`8904e23d-c5b1-48fd-8009-1c7c128acbba`). No geometry or persistence
assertion was removed. All these repaired-cohort runs have zero Svelte warnings.

The source-wide control inventory covers status/priority, both recurrence
frequency controls, recurrence end conditions, tracking, document actions and
heading selection. The actual public InlineOption contract includes selected
text in trigger names but leaves listbox labels unchanged. The shared workspace
helper now verifies both host context and complete visible selected text. The
packed settings combobox still has its bare field label, so those correct
selectors remain unchanged.

Cold exact Desktop Workspace/Runtime Detail Actions baseline reports two
failures and 22 intentional skips (`db64801b-1165-49b4-9bd1-df14cfff3384`). The
first failure precedes metadata: fixture layout still lives under `.obsidian`
while the owning Vault uses `.lapis`. Disposable seed/config and copyable example
paths now agree on `.lapis`; real restored-view assertions remain intact.

The same active-configDir contract exposed a production event-path defect:
Tasks hard-coded `.obsidian` for planner refresh admission. Seven focused cases
retain ordinary notes, active default/custom/legacy-selected directories,
neighboring prefixes and unrelated inactive directories. The unchanged extracted
policy first fails three cases/four pass; two native parser cases still pass
(`3ef5b499-2190-474c-bfc8-0310588b7d3b`). The repair reads the current vault-owned
configDir for each event rather than caching or substituting a hard-coded name.

The repaired configDir regression passes all seven cases plus two native cases
(`f7861e5c-0836-4010-8fbc-d51bf35af573`). The guarded Workspace exact run then
reaches two passes/one failure, with 21 intentional skips and no Svelte
diagnostics (`01bc7dc2-ea7b-41f2-84cd-84fe8ec39a5a`). Its last failure is the
old Tasks heading-weight expectation of 400. Design Core's governing
`DC-WS-069` explicitly requires Lapis 16px/700; its source and admitted archive
both export those values. The consumer spec and assertion now follow that
declared public contract. No production CSS or heading token is overridden.

The next exact run passes settings and reaches a later context-menu readiness
assertion: `cca0cd15-63ac-42a1-bdff-f07455ef3ec7` has three failed cases and 21
intentional skips, with no Svelte diagnostics. Its first failure checks mounted
menu items before the opening transition becomes visible; the remaining two
cases encounter its unreleased pointer lock. The play now waits for every
original menu action to become visible and interactive, then verifies menu
removal and pointer release after opening the note.

That run reaches two passing runtime-action cases and one failed Desktop case
(`59ab89ac-17cd-47e5-bdc3-3b66a98825d3`), with 21 intentional skips and no
Svelte diagnostics. The added pointer-release probe initially used Today,
which is unmounted after opening the Markdown note; it now uses the persistent
Open Tasks ribbon action. Every original menu and persistence assertion remains.

The exact cold Workspace rerun now passes all three selected cases, with 21
intentional skips and zero Svelte diagnostics
(`14fffa27-e5b9-46d9-ae79-f48f7ba60b39`). The final registry production audit
reports zero advisories across 50 dependencies; its JSON is retained locally.

The complete five affected families report 38 passes/two failures, no skips
(`d985e48d-a45e-426e-91a1-0efb876c5a27`). Four files pass in full, including
all nine Preview Row cases. Workspace Live Edit Mutations emits one retained
`derived_inert` diagnostic and remains unqualified. Linked Sublist Mutations
reads its moved row before the post-write widget rerenders; its play now waits
for each original row action to become visible after source persistence.
No source, geometry or editing-state assertion is removed. Exact acceptance
and the final aggregate wait for the final combined shared dependency cohort.

Read-only inspection found a separate possible async Task widget lifetime risk.
A disposal/captured-callback candidate was tested in
`22574bf9-c431-47f9-b49f-e2f457defa0f`: Linked Sublist Mutations passes, but
Live Edit Mutations still emits one `derived_inert` (one pass/one failure,
22 intentional skips). The speculative widget change and provisional
LN-TASK-073 were withdrawn. An independent delayed-load/unmount/deletion
regression is required before a future widget lifetime repair is retained.
The fatal guard now captures up to 50 origin frames and restores the caller's
stack limit, with a regression that places the origin beyond the default limit.

Exact guard/aggregate acceptance passes six diagnostic and four routing cases
plus two native parser cases (`e2ad3ee8-87c0-4d2a-b1b2-c10a3711ee0c`).
The final candidate declares Bits 2.20.2 normally; registry lock comparison
retains unrelated resolutions. Its production audit remains 50 dependencies,
zero advisories. Design Core candidate archive `567f022a…` comes from frozen
`d06b51e5`, with 1,557 equal public inputs and passed package audit `9e4f98ea`;
broad source and matching Notes/Mira cohort qualification remain pending.

Notes independently reproduces the link-preview pointer-up timer lifetime
defect on official Bits 2.20.2 and Design Core `567f022a…`; upstream source
repair and matching Bits/Mira/API/UI archives precede final Tasks UI acceptance.
Owned cleanup recollected and removed 18 stopped Tasks containers, preserving
local reports, caches, leases and every other checkout's runs.

## Final qualification

The [final intake](2026-10-25-docker-final-intake.md) records the original two
regressions passing, all 41 affected and all 62 complete catalog cases passing,
275 unit/two native cases, complete source gates and Design Core committed
source equality. LPT-SPEC-012 through LPT-SPEC-019 and LN-TASK-072 are implemented.
Native desktop, consumer adoption, publication and visual approval retain
separate gates; no baseline was approved or updated.
