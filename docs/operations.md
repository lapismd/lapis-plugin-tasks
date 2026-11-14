# Tasks operation provider

`lapis-task-operations` is the compiled provider for the versioned `tasks`
operation namespace. Its native dependency is pinned to the Server contract
feature revision. It delegates to Core's existing admitted Tasks services;
`lapis-task-services` remains a pure engine and has no Core dependency.

Run `pnpm generate:operations` after changing schemas or help. It updates
`operations.json` and the manifest declarations from the native catalog.
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
