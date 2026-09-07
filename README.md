# Tasks for Lapis

`@lapis-notes/lapis-plugin-tasks` is the first-party external Tasks plugin for
Lapis. It ships a vault-backed planner runtime and a Design Core-backed catalog.
The package Storybook includes a real Lapis workspace that loads the plugin.

The runtime plugin ID is `tasks`.

## Development

Published LapisMD dependencies resolve through npm semver ranges. Package
manifests must stay portable and contain no machine-specific dependency ranges.

```sh
pnpm install
pnpm spec:check
pnpm check
pnpm test
pnpm build
pnpm test:storybook
pnpm build-storybook
```

Package Storybook defaults to port 7030.

### Refreshing local development dependencies

When the sibling repositories are present, `.pnpmfile.cjs` installs local
package snapshots for development acceptance. These snapshots need refreshing
after sibling source or public exports change. If Storybook reports missing
files that exist in the owning repository, stop it and refresh the snapshots:

```sh
pnpm storybook:stop
pnpm install --lockfile=false --force
pnpm test
pnpm test:storybook
pnpm storybook
```

This temporary local validation setup leaves the registry lockfile unchanged.
Validate releases and CI against the published registry dependencies.

### Temporary browser acceptance mitigation

`pnpm test:storybook` intermittently loses the Vitest orchestrator connection
between story files. The reported transport errors are `Browser connection was
closed` and `rpc is closed, cannot call "createTesters"`; the cause remains open.

Run `node scripts/test-storybook-batches.mjs` for complete acceptance in three
sequential Vitest shards, each with a fresh browser process and one worker.
Every discovered story and existing interaction/axe assertion remains included.
The runner stops at the first failed batch. Keep the unbatched command available
for diagnosis; remove this mitigation once the transport is reliably fixed.

The preview inherits DM Sans Variable and Source Code Pro Variable from Design
Core, matching the Lapis hosts. Settings headings use the shared compact heading
tokens (16px, regular weight) rather than a demo-specific override.

The [10 October review record](spec/records/2026-10-10-review.md) lists the
repaired failures, acceptance counts, and deferred runner issue.
