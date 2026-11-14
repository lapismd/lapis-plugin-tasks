# Tasks operation provider

`lapis-task-operations` is the compiled provider for the versioned `tasks`
operation namespace. Its native dependency is pinned to the Server contract
feature revision. It delegates to Core's existing admitted Tasks services;
`lapis-task-services` remains a pure engine and has no Core dependency.

Run `pnpm generate:operations` after changing schemas or help. The isolated
Docker worker generates `operations.json` and the manifest declarations from
the native catalog. Copy both files from the reported
`.local/validation/runs/<run>/` directory into the checkout before checking drift.
`pnpm check:operations` checks drift; `pnpm test:operations` exercises native
registration and guarded execution. Server embeds that same generated JSON for
offline CLI help and checks it against the pinned provider.

Source acceptance uses the compiled provider and existing native Task guards.
Both provider cases pass against the pinned Server source: all 17 descriptors
register, and renderer-free get/cancel preserves stale-version rejection.
Strict Clippy and generated-catalog drift checks pass. Docker package check and
test pass, including 2,924 TypeScript cases and the retained native conformance
corpora. Package build/publint and host delivery are recorded separately.
Hosted listener, credentials, consent, cold restart and public package intake
are qualified in Server. Desktop intake remains separate.

Final source validation on 2026-11-14 retained Docker reports under
`.local/validation/runs/`: operation check `83b41ffa-9775-4a3b-9008-401d475ffee6`,
provider tests `ae465cf1-ff42-4592-ae7d-aa0657a5e8a7`, specification check
`8cb058ef-c610-4822-b220-680ae9ed7e65`, runner tests
`c51a493c-9a71-4789-baa4-cb006447c705` and package validation
`1f67ce26-8ff6-4fe5-a90f-b4c661586643`. Each ID is prefixed `lapis-tasks-run-`.
