# Published foundation dependency refresh

Design Core `0.3.1`, Mira `0.0.3` for development acceptance, and Spec Validator
`0.1.4` resolve from npm through portable manifest and peer ranges. Direct
installed origins were verified as registry packages on 2026-10-11. The local
package helper has no Design Core source mapping; existing development host
mappings remain. Mixed dependency, development, optional, and peer fields keep
foundation ranges intact even when sibling checkouts exist.

Browser configuration lets Design Core resolve its declared Bits UI version.
It pre-optimizes both Bits UI installations and the shared date entry point so
calendar values preserve their class identity. Navigation acceptance waits for
the visible public tooltip content and scopes the count and label to it rather
than using an ambiguous document-wide number query.

Before/after evidence:

- Initial cold full Storybook: 60 passes, two failures (`DesktopWorkspace`,
  `NavigationStates`), four skipped files, and 22 `derived_inert` diagnostics.
- Exact navigation/desktop target after dependency resolution and the owned
  tooltip query: three passes. No `derived_inert` diagnostics remain.
- Wider browser acceptance exposed three date-identity errors and two failing
  row stories. Exact `SampleRow`/`ExpandedMetadataActions` target: two failures
  and one pass before date pre-optimization; three passes afterward.
- Final unbatched Storybook: 61 passes, one desktop readiness timeout, four
  skipped files, zero unhandled errors and zero `derived_inert` diagnostics.
  Parallel startup qualification remains open; its timeout is not relaxed.
- Complete governed `node scripts/test-storybook-batches.mjs` acceptance:
  batches pass 14, eight, and 40 scenarios (62 total), retaining all four
  metadata-only skipped files. Each batch uses a fresh process and the existing
  one-worker configuration; no story, assertion, readiness timeout, or axe gate
  is excluded. This is the canonical temporary complete acceptance arrangement
  already documented in Specification Governance.
- Exact mixed-manifest hook regression: one failure before retiring the source
  mapping, one pass afterward. Complete hook suite: three passes.
- Final `pnpm check`: zero Svelte/TypeScript errors and warnings.
- Final `pnpm test`: 202 unit tests pass.
- Final package build, publint, full specification checks, and static Storybook
  build pass. App ownership and no-Tailwind audits remain enabled.

Visual status stays pending and no baselines change. Package snapshots remain a
local development acceptance setup; this is not a complete registry-only release
of the host packages. The unbatched parallel readiness failure is recorded
separately from the passing complete serial interaction/accessibility lane.
