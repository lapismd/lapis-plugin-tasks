# Tasks 0.4.0 inactive audit bindings

Release PR #43 changes the package/runtime version from 0.3.0 to 0.4.0.
The package manifest hash therefore changes, while the frozen lock and actual
dependency graph remain unchanged. The disabled HIGH proposal, already-expired
approval and negative test fixture retain their exact matching manifest binding.
Approval source, authority, dates and expiry are unchanged; no exception is
created or renewed. Historical evidence and raw audit fixtures are unchanged.

The hosted Unit tests lane failed one case out of 2,987. The exact Omarchy retry
`pnpm ci:unit -- scripts/development-audit-proposal.test.mjs -t 'binds actual manifest'`
also failed one case before this binding refresh. The original hosted failure is
retained in workflow 45531961444, job 138929214571.

The same exact Omarchy retry now passes (1 selected case, 6 unselected cases).
The complete owning `pnpm ci:unit` suite passes all 2,987 cases in 74 files,
including all seven proposal tests. Neither the test nor its assertions changed.
Run `lapis-tasks-run-16faa5a3-fe07-4ccf-aae6-f636554fe6aa` retains that full result.

The initial specification check refused the missing mapped Governance chapter;
that chapter now records the same inactive-binding boundary. A concurrent unit
launch refused the existing workspace lease; the full unit retry ran serially.
No lease bypass or scope exemption was used. Final specification and hosted
release gates remain required before merge.
