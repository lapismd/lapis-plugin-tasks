# Qualified version runtime

LPT-SPEC-021 adds a reviewed shared runtime-input guard before the existing
version-job App mint. It preserves the successful Validate dependency, canonical
main/non-PR condition, frozen registry install, exact custom command, Changesets
no-op output and separate protected publisher. No product source, dependency,
Changeset, Deno prerequisite, approval or activation changes.

## Actual recipe proof

[Hosted proof43798034223](https://github.com/lapismd/lapis-ci/actions/runs/43798034223)
passed on shared helper source
`bfa9743d8b403681ef7fb81ae3c5e53a99e3de55`, using exact Tasks source
`00d8b1929538bb945078a303343eb4fd5410ce18`. Its genuine pending note
`.changeset/api06-host-compatibility.md` has SHA256
`ed91c7e51adc02324fa59b768af1f60aac233180f5b65cd322a0772b75994d5c`.

Node24.15.0, pnpm10.34.5 and installed CLI3.0.3 ran the actual
`node scripts/release.mjs version` recipe with Deno absent before and after.
The fixture installed the frozen registry graph with scripts disabled and
`--ignore-pnpmfile`, retaining the source job's local-hook exclusion. The
unchanged recipe refreshed the lock with its existing `--ignore-pnpmfile` flag.
It prepared0.2.0→0.2.1, changed the changelog, consumed the real note and verified
the runtime manifest and canonical release marker against both old/new versions.
No writer App was minted, branch pushed or package published.

The current root/lock/config/workflow/helper/workspace/manifest/canonical input
tuple is bound across eight source paths in the upstream case. Lock SHA256:
`5fdc31934e2dfc544ff2d4772e27c9c2aca929a9df292b95318cba59ae0376e3`.
Downloaded receipt SHA256:
`bab39fdc82f22b65af77c2e75259ddf0f1fbf63d2b42e2383b41da9bb8ff96c2`.
The receipt remains local evidence outside the checkout.

## Source adoption and acceptance

`.github/versioning-runtime.json` copies only that successful receipt's public
input bindings. The shared action is pinned to the reviewed proof source above.
CLI major, pnpm version, Changesets config, complete release-helper bytes and
workspace policy match the qualified tuple; workflow/spec documentation gains
only the guard admission requirement. Existing runtime/canonical versions and
the pending source note remain unchanged. The helper fails on unknown contexts
instead of copying code here, installing another runtime or forcing a formatter.

The parsed new integration test failed1/1 before adoption and passed1/1 after;
it checks the exact shared pin/data, install→guard→App ordering, canonical job
gate, no-op output, script/config/file hashes and unchanged writer boundary.
All95 script tests pass, alongside routing44 lanes/0 findings, Storybook
composition25 families/0 findings, spec3 lanes/spec-first and the App ownership
audit. Doctor reports10 passes and the existing governed script-alias warning;
QMD semantic discovery succeeds. The installed/latest Deno-free validator is0.2.0.

`pnpm audit --json` exits0 under the existing unchanged dependency policy;
raw metadata still reports1LOW. This is not a zero-finding audit or a new waiver.
Read-only name metadata confirms the existing client-ID variable and named
App-key secret are present; no values are exposed or changed.

Full applicable hosted functional/native/browser/axe/package lanes remain
required on the PR head. Genuine post-merge guard execution and main version
automation remain operational acceptance separate from the disposable proof.
Every existing artifact, OIDC, provenance, signature, registry, protected
publication and dependency-notification gate retains its original authority.
