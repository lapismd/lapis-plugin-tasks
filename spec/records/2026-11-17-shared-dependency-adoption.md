# Tasks shared dependency workflow preparation

This is a held source adoption under LPT-SPEC-025 and LPT-SPEC-026.
The coordinator entry remains `full`; Notebook remains the only active pilot.
No package version, public peer, runtime source, visual baseline or publication
authority changes. No new release note is added.

## Shared wiring and existing authority

Coordinator PR73 merged the exact CI/npm and Pages completion IDs/paths/events.
The caller and implementation both pin source
`2cef3b7fdf5e68012c3fa58b017822ea8b218230`. Only the explicit existing App
secret is passed; no candidate checkout, artifact, cache or callback self-trigger
is admitted. The read-only existing-App probe
[44162260708](https://github.com/lapismd/dependency-automation/actions/runs/44162260708)
succeeded without key retrieval, copying or rotation. Current open issues/PRs
were empty before this adoption. Historical main CI/Pages were green.

## Source qualification

Before implementation `pnpm check:dependency-intake` failed because the task
did not exist (one missing-feature failure). The new independent offline guard
passes current source and the actual pnpm Core0.13.4→0.13.5 lock regeneration
against the shared preparer. All15 focused regressions pass, including stale or
ambiguous facts, changed policy, public contract/catalog drift, unrelated
peer-context edges, prefix-sharing identities and immutable integrity changes.
The compressed fixture contains this repository's actual before/after files;
it is not a renamed Notebook graph. Public peers remain unchanged.

The reviewed Node24 runtime guard is pinned to Lapis CI
`dd71275c5b2618afceae0b97ee0a071649781971`. The development workspace policy
binds every byte except one supported Core0.13 development patch coordinate.
All original release/config/helper hashes remain bound. It runs before merge
and again before the existing writer boundary. The installed CLI3.0.3 and exact
package manager accept current source with intent=false. In a separate isolated
copy, an uncommitted-to-source genuine patch note yields intent=true and the
actual unchanged `pnpm release:version` succeeds. No publication occurs.
This local proof does not claim a current-source hosted release-job receipt.

Doctor and actual QMD search succeed. The guard remains in ordinary check/quality
and canonical aggregate lanes outside bot specification exemptions.

## Required security hold

Fresh full audit reports **one HIGH** GHSA-fc5q-39xc-vjpf, picomatch4.0.7 at
`.>@changesets/cli>@changesets/config>picomatch`; production audit has zero
findings. No patched version is recorded (`<0.0.0`), and the current Changesets
CLI/config releases still use this dependency. The version workflow can execute
this tooling with a repository-scoped writer App, so production cleanliness
alone does not waive the finding. The separately approved coordinator paths
do not authorize this consumer path. No new exception or weakened audit is added.
All required audit, functional, accessibility, publication and ownership gates
remain blocking. Merge, callback settlement and per-entry writer activation
remain pending until those gates and source acceptance pass.

## Input receipts

- `package.json` SHA256 `15f8078f76a4cf9d68a6107a48be2b98ad4b367878c223d6c6a5c026ebaad545`
- `pnpm-lock.yaml` SHA256 `4bd16d53d38d480f18f0e1670805d6c26a124baa1aade93ff17a24be82b38849`
- `.github/dependency-automation/canonical-intake.json` SHA256 `d36b49de0dfaee07e8ef1c245dd263b5f0065ccc7b085aa2d311a1c21a2fd460`
- `scripts/fixtures/core-intake.json.gz` SHA256 `c15658c82b197bafe7ba35ac83b65007214abc8e8f8579968a65909eb8b3210a`

## Source-owned lock setup and initial regression repair

The manifest's Core development range is pinned to its already-resolved0.13.4;
its public peer remains `^0.13.2`. The matching workspace override is added.
Actual pnpm10.34.5 regeneration changes the root development specifier and
normalizes two package peer metadata rows. It also aligns existing
`@changesets/parse` and `@manypkg/tools` YAML edges from2.9.0 to the already
present2.9.1; no package keys are added or removed. That explicit initial
source normalization is not an allowed future bot mutation. A subsequent real
forward Core patch has no unrelated closure drift. The existing Bits patch
and audit configuration remain unchanged.

Initial full validation exposed one stale workflow pin assertion; its repair
then exposed one new assertion targeting Quality rather than the actual
unconditional Governance guard. Both exact pin and placement assertions are
now preserved and the focused six-case runtime suite passes. Final unit
validation passes2968/2968, including the15 independent intake cases.

The Tasks index is larger than the coordinator's bounded managed-chapter input.
Catalog facts therefore live in the small Plugins index and a dedicated
dependency-automation chapter, with the matching SUMMARY, Storybook mirror
and ordering. No canonical size bound is increased.

## Completed portable acceptance

Docker `pnpm validation:all` passes all12 aggregate lanes in owned run
`lapis-tasks-run-385adb5c-8444-429e-ab83-74df9efdd2c1`, source snapshot112cf722.
This includes check, native checks/tests,2968 unit tests, build/publint, static
Storybook,66 cold browser interaction/accessibility cases (15/9/42 across the
three batches), all three specification lanes and App ownership. Package and
registry acceptance also pass: npm candidate preparation, registry checks,
all16 unchanged media outputs, registry preparation, and cold development and
production archive hosts mounting the actual Tasks plugin/planner/details and
Markdown composer through teardown. No upload, signing or publication is run.
The final source-record edit adds evidence only after that executable snapshot.
Explicit native focused diagnosis additionally passes21/21 guard/runtime cases.
Actionlint passes. Required hosted audit/activation remains held as above.
