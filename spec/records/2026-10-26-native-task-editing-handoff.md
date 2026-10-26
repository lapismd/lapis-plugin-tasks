# Native Tasks editing registry handoff

Base: qualified recovery source `26ded270`. The source guard baseline
`efc84ef1` has two selected failures and one existing selected pass, with all
27 native cases passing. It proves the prior adapter read/admitted native work
without the existing App registry guard, and persisted lifecycle identity only
after an unguarded read.

The source repair holds `fileEditingSessions.guard` through source re-read and
native admission, allowing the existing registry to protect editor flush,
yield and rearm. Single-file mutations use their path; lifecycle, occurrence
and explicit retry use the all-file guard. Inspection is read-only. Client
recovery-reference writes stay outside the guard to avoid writer re-entry.
A local flush refusal never claims an unknown native outcome. Exact source,
full source and public pack qualification remain separate from actual hosted
and Desktop editor acceptance. No native policy, wire contract, default or
app-signing change belongs to this source adapter slice.

Exact after-check `22b2c770` passes all 19 adapter cases plus all 27 native cases.
It proves path/all-file scopes, persist-before-guard ordering, source reads inside
the held guard, rearm after failed native admission, read-only inspection outside
the guard, and zero native calls/uncertainty on a local editor refusal. Complete
owning package and public archive qualification follows on the same runtime.

Initial full run `40de3260` stops at specification validation because the new verification row used an unsupported status. It runs zero product checks; the row now uses the repository-supported source status `Implemented`.

Complete source run `dfd49021` passes all 2,875 unit, 27 native and 63 cold
catalog interaction/accessibility cases, strict checks, source build, publint,
static Storybook and final specification gates. Its public archive is packed
from the same owning build. The final supporting receipt changes no product,
story, manifest, lockfile or archive bytes; specification validation is rerun.
Actual hosted/Desktop native editing-intent acceptance remains a consumer gate.
