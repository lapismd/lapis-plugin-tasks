# Visual Delta 0.1.5 development intake

The development-only update in PR 15 resolves the published Visual Delta 0.1.5
artifact, whose npm integrity matches its verified release. Tasks stays at
0.1.4. Runtime dependencies, host contracts, comparison-only visual review and
baseline-approval rules are unchanged.

Hosted CI `43579531649` passed quality, unit, native, static Storybook and all
three interaction shards. Governance rejected the package/lock change because
both mapped canonical chapters still described Visual Delta 0.1.0.

The Docker reproduction
`pnpm spec:first --base 634f66b4500a5f437fa2da461f599e8023f02247 --head d5bd04b1f1fd50d2cde86bb14eb9f138dcbd6c5b`
reports two `SPEC-FIRST-MISSING` findings under LPT-SPEC-002. The repaired target
uses the same base with `--head @`, covering the entire dependency intake and
both corrected chapters. No validator or bot exemption was weakened.

The first diagnostic accidentally passed range arguments to the aggregate
`spec:check` lane, where they reached the final Vitest command and were rejected
as an unknown option. That invocation is not counted as regression evidence;
the dedicated `spec:first` reproduction above is authoritative.

Docker qualification: the explicit full-intake spec-first range passes with
two protected files and both canonical chapters. The aggregate `pnpm spec:check`
passes its three specification lanes plus routing, story parity and the one
App-ownership audit test. Prettier passes for all four documentation files.
The existing hosted functional results remain supporting evidence; every
required hosted gate must pass again on the updated pull-request head.
