# Tasks registry onboarding — 1 November 2026

The next patch is requested through Changesets (0.1.2 after the version PR).
Existing npm 0.1.1 and its scoped GitHub tag are immutable. This change adds
root registry metadata, deterministic installable packaging and release/manual
submission to the registry's one-file queue. The npm approval/provenance flow,
runtime ID `tasks`, App ownership and maintainer registry merges stay intact.

## Executed qualification

- `pnpm test -- scripts/registry-onboarding.test.mjs`: the original narrow
  boundary starts with two missing metadata/workflow failures and finishes with
  two passes, including root changelog presence.
- `pnpm registry:check`: 22 passes covering deterministic signed archives,
  pinned-key rejection, retained published assets, dry runs without mutations,
  bad signatures/checksums/tags/coordinates/sizes, immutable incomplete pairs,
  source admission and CI pagination/latest result, media paths/order and
  unchanged vendor provenance.
- `pnpm test:storybook -- src/stories/RegistryScreenshots.stories.svelte`:
  two interaction/axe passes. Initial new fixtures had two failures because they
  omitted the existing full-shell accessibility policy; the shared policy has
  the same existing rules as functional Shell stories. No diagnostic or visual
  baseline is suppressed or changed.
- The host import-map regression exposed 12 unsupported external component
  paths: one failure and 21 passes before the fix, then 22 passes. The producer
  now bundles components outside the published public web host allowlist and
  declares every remaining external import, including its renderer ABI.
- `pnpm registry:runtime:check`: cold development and production hosts load
  actual bytes from a verified archive using an ephemeral acceptance-only key,
  prove that the registered constructor is the archive class, open the real
  planner/details and retain fatal diagnostics through teardown. The governed
  host configuration and strict public entry exports are used in the consumer.
  Temporary key material and the signed copy never enter publication artifacts.
- Constructor selection retains the ordinary TasksPlugin default. The existing
  registration source audit initially failed on its old literal-only assertion;
  `pnpm validation run ci:unit -- src/lib/tasks-plugin.test.ts` reproduces one
  failure and then passes with both the unchanged default and selected-constructor
  guards. Existing prohibitions on host-owned view/command/ribbon registration
  remain, alongside the actual archive constructor/browser proof.
- Final `pnpm validation:all` passes in Docker run
  `lapis-tasks-run-4c285089-e2b3-4450-b75c-926a73602d7f`: full check/specification
  and App audit, 2,915 unit tests, 27 native tests plus native check/build,
  build/publint/npm pack, static Storybook, all 65 interaction/axe cases in three
  fresh batches, registry/media verification, npm artifact preparation and both
  cold archive host modes. There are no unexplained failures or new test skips.
- Full and production dependency audits exit zero with patched Sharp 0.35.5.
  The existing development-only deepmerge/GHSA-gcqx-w48m-w2h4 exception remains
  unchanged, with its existing removal condition; no other advisory is ignored.
- spec-validator 0.2.0 is already the latest Deno-free release. Node 24 QMD
  search/index and doctor run natively; QMD is not added to Docker or CI.
- Workflow actionlint passes after excluding only stale action metadata for
  create-github-app-token v3's supported `client-id` input. Upstream v3
  `action.yml` was checked; `app-id` is deprecated.

## Receiver and media evidence

The real prepared archive and all pinned source metadata/media pass the registry
receiver (`verifyReleaseBundle` and `fetchPluginSourceMetadata`) at current
plugin-registry main `0f3b61317a6e1331b6e6c600560cc36fa7587de8`; the verifier
files are unchanged in the checked-out receiver. This supplementary native
acceptance uses a disposable test key and validates four signed files in a
596,132-byte test archive. It grants no production trust and sends no dispatch.

All 16 media variants use the same Visual Delta 0.0.7 capture engine and unmodified
compositor as lapis-plugins: fixed owned stories, real WorkspaceShell, 1200x800 at
2x, Inter, light/dark and preview/full variants. The compositor SHA-256
`adb5e891846522f8cc916bd2a774e3ee922f2712cf7c50dceaf22d4452dff5b9` matches
lapis-plugins main `f1b8823d3f1ce8e238a61f529d0fb5c66deabb43`. Normal cold capture
and byte-for-byte media checks pass; preview copy was inspected for clipping.
Human visual approval remains pending and no Visual Delta baseline is created.

## Live rollout

Review/land this change and the normal Changesets version PR. Configure the
protected registry-production environment, existing approved signing/App secrets
and explicit REGISTRY_PUBLICATION_APPROVED gate. After the approved npm/GitHub
release, the workflow verifies downloaded immutable assets and dispatches their
signed source commit. CI completion also triggers discovery because GITHUB_TOKEN
release events are suppressed. Manual verification defaults to dry-run; live
submission, source release approval and registry PR merges remain separate gates.
