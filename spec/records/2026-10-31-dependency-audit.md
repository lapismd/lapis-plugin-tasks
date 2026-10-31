# Tasks dependency audit floors

Date: 2026-10-31

The first split workflow, run 41217882472 at `1c41d7bf`, passed Governance,
Quality, Unit tests, Native, Static Storybook, and all three Storybook
interaction shards. Dependency audits failed `pnpm audit` before the production
audit ran. Validate then failed closed and did not prepare a release tarball.

The failing graph contained patched-available findings:

- critical and high DOMPurify through mermaid, fixed at `>=3.4.17`
- high and moderate brace-expansion through sigstore, fixed at `>=5.0.12`
- high source-map-js through Tailwind, fixed at `>=1.2.2`
- moderate minimatch GHSA-g3hv-75wg-m249, fixed only at `>=11.0.1`
- moderate glob GHSA-3g3m-2fjr-6pw4, fixed only at `>=14.0.2`
- low KaTeX GHSA-238p-pmpm-9mq7 through mermaid `katex ^0.16.47`, fixed at `>=0.18.2`

Mira 0.1.4 already resolved KaTeX 0.18.10. The remaining 0.16.47 copy belonged
to mermaid, so the workspace floor is the Tasks remediation and does not replace
that Mira release. Sigstore stays at 4.1.1. The Bits UI patch hash stays
`debd3bc7d43917f0967f0cc1e212fc5c7721c751d3b92bf8f31030d1c96289ad`.

`deepmerge@4.3.1` has no patched release for GHSA-gcqx-w48m-w2h4. The workspace
`auditConfig.ignoreGhsas` list admits only that advisory, reached through
`@sveltejs/vite-plugin-svelte`. Remove the ignore when a patched deepmerge
version exists.

After the lock refresh, local `pnpm audit` reports one ignored low and
`pnpm audit --prod` reports no known vulnerabilities. This record does not
claim the hosted re-run has passed. LiveEditMutations and
ExpandedMetadataActions passed on the split shards, so they stay unquarantined.
