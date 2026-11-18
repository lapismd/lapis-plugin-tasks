# Tasks explicit-user development HIGH decision

This records the exact explicit user approval given in the organisation cleanup
thread for HIGH GHSA-fc5q-39xc-vjpf. It does not transfer Community, Docs,
Mira, Core, or coordinator authority. Production findings and every unmatched
full finding remain blocking.

## Reviewed source and evidence

Dependency source: `a86b18bde00a8cb744518ad65d46d4fa87da8ecb`.
Manifest SHA256: `15f8078f76a4cf9d68a6107a48be2b98ad4b367878c223d6c6a5c026ebaad545`.
Lock SHA256: `4bd16d53d38d480f18f0e1670805d6c26a124baa1aade93ff17a24be82b38849`.
Workspace SHA256: `21bba751578612b319523e1f906dcb3705b4836a6a265ca25101b0cebfde12d0`.

The disabled proposal at `.github/development-audit-high-proposal.json` bound
these identities before approval. Shared collector pin remains
`63e64958e9b271d36feba06a162ee02b079a3206`. Raw full audit retains HIGH1 with
all other severities0; production audit is clean; muted is empty.

## Exact decision

At 2026-11-18T13:30:52.633Z, under explicit-user authority, accept only
GHSA-fc5q-39xc-vjpf, HIGH picomatch 4.0.7, on development-only path
`.>@changesets/cli>@changesets/config>picomatch`, vulnerable range `<=4.0.7`,
patched range `<0.0.0`.

Expiry remains 2026-11-19T00:00:00.000Z, or sooner on a known patch or official
stable successor above 4.0.7. The shared checker additionally limits HIGH to 48
hours from this approval timestamp. No renewal, broader ignore, production
exception, or cross-repository transfer is granted.
