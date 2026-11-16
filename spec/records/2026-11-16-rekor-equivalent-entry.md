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

The release helper changes the exact version-runtime binding. Main admission
remains held until an immutable source candidate executes the unchanged full
Node 24 `pnpm release:version` recipe in a disposable copy with genuine historical
Changeset bytes. Prospective guard data is not treated as proof. Source-owned
guard adoption and hosted actual-recipe qualification retain separate receipts.
