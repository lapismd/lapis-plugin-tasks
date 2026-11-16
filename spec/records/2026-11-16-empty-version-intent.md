# Empty maintenance notes and publication selection

Tasks source31e62a0f passed main CI43821839921 after the Rekor recovery repair.
The version job reported “All changesets are empty; not creating PR”, but its
hasChangesets output remained true. The publisher therefore skipped the already
prepared, unpublished0.2.1. Repeating that job cannot resolve this state.

The source workflow now asks the installed runtime-qualified Changesets CLI for
its status release plan after the existing shared runtime guard. Only a genuine
version-changing Tasks release mints the repository-scoped App token and runs
the unchanged custom version command. Empty notes remain retained, do not
manufacture0.2.2 and do not prevent the independent publisher from considering
the existing qualified0.2.1 candidate. Unknown targets, command errors and
malformed evidence still fail closed. All required Docker/audit gates, immutable
artifact checks, protected environment, provenance and publisher verification
remain required.

The exact parsed-workflow regression failed1 of5 before repair. The repaired
focused Docker command `pnpm test -- scripts/version-pr-auth.test.mjs
scripts/version-intent.test.mjs` passes10 of10 in
run46b66359-c944-40a0-8fde-1cb8d1ddd74c. Actual CLI fixtures cover no notes,
the retained empty recovery note, genuine patch plus empty note, and an unknown
package; package/note bytes remain unchanged. Their isolated Jujutsu repositories
provide the real main reference needed by CLI status. An initial fixture without
that repository failed3 cases and was corrected without changing production
behavior. Invalid plan and foreign/multiple target controls also fail closed.

The existing version recipe's command, manifest, lockfile, config and three
guarded helper/workspace bindings are unchanged. Hosted whole-recipe proof
43821246307 remains the recipe evidence; this slice adds a preceding read-only
selection step, not another version command or product release intent. Complete
local and current-head hosted qualification are required before merge; actual
main publication and verified registry read-back remain separate acceptance.

Complete default Docker `pnpm validation:all` passed in
run0f0f8a0f-57f4-451f-afe5-f9dbe92faf4b:2943 units, unchanged native tests,
all66 interaction/accessibility cases, both cold packed public consumers,
check/build/publint/specification, static Storybook, registry and immutable
release preparation. Formatter and actionlint pass; doctor passes10 checks
with the existing wrapper-alias warning. No package graph or release-recipe
binding changed. Hosted qualification and actual0.2.1 publication remain open.

Fresh existing audit commands both exit0: the full graph still reports one
LOW and production reports zero findings. This slice neither calls that full
graph clean nor changes the existing severity policy or grants an exception.
