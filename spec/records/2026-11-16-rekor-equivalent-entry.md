# Verified Rekor equivalent-entry recovery

LPT-SPEC-024 repairs the Tasks publication boundary on merged source
`bb851a6d`. Run 43811868999 completed qualification and protected approval, then
failed once before npm publication: Sigstore reported
`TLOG_CREATE_ENTRY_ERROR` with Rekor HTTP 409 and an equivalent-entry location.
Tasks 0.2.1 remained unpublished. No failed signing job is blindly retried and no
package version, npm credential, release channel or approval gate changes.

## Supported SDK integration

Installed `sigstore@4.1.1` does not expose fetch-on-conflict in its public signing
options. Its high-level configuration explicitly passes false, so an unknown
option would silently fail to repair the boundary. The public
`@sigstore/sign@4.1.1` RekorWitness API supports `fetchOnConflict:true`.
Tasks composes its public DSSE builder, Fulcio signer, CI identity provider and
Rekor witness, then serializes through public `@sigstore/bundle@4.0.0`.
These exact versions were already locked; direct development declarations make
those public imports explicit without updating the resolved SDK graph.

The 31-line Tasks integration preserves the original public Fulcio and Rekor
endpoints, DSSE entry type, certificate format, Sigstore CI audience, two retries
and five-second timeout. Every result still passes the existing full Sigstore
signature/transparency verifier and exact GitHub workflow identity policy before
either provenance file is written. Recovery belongs to the SDK; no HTTP error
is ignored, private SDK path imported, dependency patched or verification bypassed.

Primary evidence:

- [Upstream duplicate-entry issue](https://github.com/sigstore/sigstore-js/issues/1708)
- [Upstream default-recovery change](https://github.com/sigstore/sigstore-js/pull/1709)

The upstream change merged on 2026-10-27. The installed high-level 4.1.1 behavior,
not an assumed upstream default, determines this source integration.

## Regression boundary

The original local source regression fails once before repair: the actual SDK
POST receives 409 but no recovery GET occurs. After repair it passes. The local
HTTP fixture exercises real SDK bundle construction, Rekor transport and full
cryptographic verification; only signing replays the existing public Design Core
fixture signature and the network endpoint is redirected to local HTTP.
There is no live signing or publication request.

The seven SDK regressions cover ordinary creation and 409/GET equivalence,
cryptographically valid recovered evidence, preserved transport/identity defaults,
foreign workflow rejection, wrong subject and changed log evidence, missing
location, forbidden creation, failed retrieval and malformed retrieved entries.
Foreign or mismatched evidence cannot create either provenance output.
All 25 focused SDK/attestation/release cases pass.

## Actual version-recipe qualification

Immutable candidate `61b3b1366ac66462371c76d50feb94c8f3dc05d1` passes the unchanged
whole `pnpm release:version` recipe on Node 24.19.0, pnpm 10.34.5 and CLI 3.0.3.
The independent disposable clone uses a frozen scripts-disabled installation
and an isolated tool PATH where Deno is absent. It restores only the exact
historical `.changeset/api06-host-compatibility.md` bytes from ancestor
`00d8b1929538bb945078a303343eb4fd5410ce18`, hash
`ed91c7e51adc02324fa59b768af1f60aac233180f5b65cd322a0772b75994d5c`.
This is labelled validation input, not new product release intent.

The recipe prepares an actual 0.2.1→0.2.2 fixture mutation, consumes the note,
updates its changelog and synchronizes both source-owned manifest/specification
outputs. Recipe/configuration bytes remain unchanged throughout. No package is
published and no writer App token is minted. Only the disposable clone's new
local main baseline is created; the user repository's main ref is untouched.

[The formatted source receipt](2026-11-16-rekor-version-recipe.json) binds the
source, package, lock, configuration and helper closure. Its SHA-256 is
`031c7ff37e60e6e1d383bee6621717841cb692ffbbf0b3cbb8467adfd2463ed8`;
the original local JSON receipt remains
`04030b32eef600e7095f5886e9882e0c5d92f0f9152ceafd1594cf2b7a25a1ed`.
Prospective guard hashes were held outside source until this whole recipe passed.
Source-owned guard data now binds both `release.mjs` and its new signing helper;
the parsed admission regression fails before adoption and passes afterward.
Hosted immutable-source whole-recipe proof and actual publication remain separate
required acceptance, owned by the release operator.

## Required source gates

Node 24 native diagnosis passes `pnpm check`, full `pnpm test` (2937 unit cases
and 29 Rust cases), build and publint. The exact SDK regression passes
one-after/one-failed-before; the new helper-binding regression likewise changes
one failure to one pass. Specification check/first, formatter, actionlint and
source runtime-guard execution pass. Doctor reports 10 passes and the existing
intentional wrapper-alias warning; semantic QMD discovery succeeds.

Production audit reports zero findings. Full audit exits successfully under the
unchanged existing repository policy while metadata still reports one LOW;
it is not described as an unconditionally clean full graph and no exception is
added, transferred or broadened. No Storybook or product presentation changes
are made by this publication-only SDK integration. Hosted full CI and the shared
current-source recipe fence remain required before merge; actual signing and
publication remain protected operations.
