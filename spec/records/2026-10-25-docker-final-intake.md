# Final Tasks Docker and catalog intake

Last updated: 2026-10-25 19:55:01 UTC.

Status: verified source slice complete. Exact, affected and complete consumer
gates, Design Core committed source admission and final specification check pass.
The [earlier record](2026-10-25-docker-validation.md) retains every failed,
interrupted and superseded attempt. This record does not erase those receipts.

## Exact final acceptance

All three final runs transfer source `46c1b4b3b653df1097aa6186b82fabf234d8db54`,
parent `569d7e30ed86bd4514365e50befb908b2a8400e2`, plus the same 16 verified
public archives. The explicit inventory is the ignored
`.local/validation/final-cohort-20261025.json`. Each receipt retains exact
arguments, source pack, package checksums, installed lock, tools, outputs and
combined logs under `.local/validation/runs/lapis-tasks-run-<UUID>/`.

The worker image is
`sha256:32c745d2c3bd24816b49548c72888ce5b4a09f5cdbb6bb03eeeba06fd750bfe3`,
with Node 24.15.0, pnpm 10.32.1, Rust 1.99.0, Jujutsu 0.45.1 and mdBook 0.5.4.
Remote Docker uses four CPUs, 12 GiB memory and 2 GiB shared memory. Every run
starts a fresh isolated process; no user vault/profile or host dependency
mount participates.

Every command below selects that inventory through
`LAPIS_TASKS_VALIDATION_ARCHIVES=.local/validation/final-cohort-20261025.json`.

| Boundary | Command | Result | Run UUID |
| --- | --- | --- | --- |
| Original mutation failures | `pnpm test:storybook -- src/stories/PluginWorkspace.stories.svelte -t 'LiveEditMutations\|LinkedSublistMutations' --reporter=verbose` | Both exact cases pass; fatal lifetime diagnostics move from one to zero. | `ad70e333-e048-4ce1-8582-4082df56bcad` |
| Complete affected families | `pnpm test:storybook --` with the nine files below | All 41 cases pass; no fatal or unhandled diagnostics. | `8696436c-e44b-4059-a4ee-ea36f849d7da` |
| All existing source/catalog gates | `pnpm validation:all` | 275 unit cases in 43 files, two native occurrence cases, all 62 catalog cases and complete check/build/publint/static/specification gates pass. | `593aa1ee-787e-4d00-a37f-6bd87058a658` |

The affected family run includes:

- `src/lib/tasks/application-planner-task-row/ApplicationPlannerTaskRow.stories.svelte`
- `src/lib/tasks/application-task-preview-row/ApplicationTaskPreviewRow.stories.svelte`
- `src/lib/tasks/application-task-planner-mode/ApplicationTaskPlannerMode.stories.svelte`
- `src/lib/tasks/application-task-planner-mode/ApplicationTaskPlannerColumnCanvas.stories.svelte`
- `src/lib/tasks/application-task-planner-mode/ApplicationTaskPlannerAppShell.stories.svelte`
- `src/lib/tasks/application-tasks-preview/ApplicationTasksPreview.stories.svelte`
- `src/lib/tasks/application-task-reference-picker/ApplicationTaskReferencePicker.stories.svelte`
- `src/lib/tasks/application-task-reference-form-field/ApplicationTaskReferenceFormField.stories.svelte`
- `src/stories/PluginWorkspace.stories.svelte`

The aggregate starts at 19:42:29 UTC and finishes successfully at 19:46:42 UTC.
Its source-pack SHA-256 is
`507d98a9b246e7c5e2399052431342aaa883594e4abffd9f79f99e7ffdce9c0e`.
Its three sequential browser shards pass 14, eight and 40 cases; there are zero
failed cases. Filtered files in a shard are not counted as executed acceptance.
The final specification reports nine validators, 12 chapters and 91
requirements; all 23 source composition families and all 23 routed validation
lanes have zero findings. No original production assertion, runtime diagnostic,
geometry requirement or accessibility rule is suppressed.

## Source and dependency identity

Design Core's audited candidate archive SHA-256 is
`c77a3a83391b9fafd42c7f99f695af03b29941c1022a5a8bbacb3964d45e55c7`.
Design Core commits the SwipeItem callback-lifetime source fix at
`4af345c4cfb7401d004b83a7a81ff7e9a812aa21`. Its complete source run
`acf23771-150c-4c9e-8ecd-afed5174d76f` passes 922 units, 983 stories,
16 workspace, 17 shell, three AI and 153 shared-control browser cases, with one
existing intentional skip, plus format/types/specification/static/metadata
checks. Its owner rechecked all 1,557 public inputs after commit: every input
equals the audited candidate. The unchanged archive is admitted through that
source receipt; Tasks source and consumer gates remain separately recorded.

The upstream Bits timer repair is source commit `a27be819`, archive SHA-256
`7b0fea714ddc489a57340ba649276b9f23bbd91ffac38d62244e44d24b7a5109`.
Tasks declares Bits 2.20.2 normally, with an ordinary registry lock. No consumer
patch is forwarded. Matching Notes API/UI archives have SHA-256 values
`cc164da81823285086876e0a1948b801031c795808999faa1218f68f38ee5393` and
`349ad6b2400837c6c6c90dd0d6b5f1798d540a50faf1efa4efa13d6e56652093`.
Their package source and provisional qualification are recorded in each run;
Notes retains its separate final source gate.

## Scope review

LPT-SPEC-012 through LPT-SPEC-019 and LN-TASK-072 have passing exact and complete
consumer evidence and the selected public source archive is admitted. Their
verification rows are implemented. Final document/specification run
`5e2e60f9-652d-46c1-9ad7-74ee99520298` passes routing, composition, canonical
validation, mdBook, spec-first and the App ownership case. It changes only the
two evidence Markdown files and the verification status table relative to the
fully qualified source; production, tooling, fixture and test bytes are unchanged.
No product or catalog sources changed after the final passing snapshot.

Native occurrence/document parser functionality, host indexing/writer selection,
actual desktop acceptance, registry-only release, publication and visual
approval retain independent gates. Changed stories remain `visual-pending`;
no visual baseline was created or replaced.
