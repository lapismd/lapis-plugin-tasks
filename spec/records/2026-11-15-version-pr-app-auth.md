# Version PR App authentication

Revision: enclosing Jujutsu change.

## Contract and review

LPT-SPEC-021 version PR writes now use the existing dependency App only on canonical
main, scoped to this repository with contents and pull-request write permissions.
Missing credentials fail closed and checkout retains no credentials. The workflow
token remains read-only except existing actions-write dispatch authority where
needed. Existing publisher, dispatch, native and signature gates are preserved;
Changesets does not directly create GitHub releases. No package version changes.

## Verification

- Exact parsed auth regression: 2 failures before the workflow change; three
  passes afterward. Coverage includes canonical admission, scope, absent fallback,
  checkout credentials, API commits, pins and publisher/dispatch token separation.
- `LAPIS_TASKS_VALIDATION_RUNTIME=native pnpm spec:check`, `pnpm check`,
  `pnpm test`, `pnpm build`, and `pnpm publint`: passed.
- Full unit suite: 2,929 passes. Native services and operation-provider tests,
  Rust Clippy, formatting, public package build and publint passed.
- Pinned actionlint on the changed CI workflow: passed.

## Remaining acceptance

Existing publisher OIDC, signatures, provenance and registry verification stay
unchanged. Hosted generated-candidate acceptance remains pending. No story or
presentation source changed; browser/visual approval is not claimed.

Next action: review the protected source PR and qualify the next eligible
App-created version candidate. Do not manufacture a version bump or merge it
without its existing review and functional gates.
