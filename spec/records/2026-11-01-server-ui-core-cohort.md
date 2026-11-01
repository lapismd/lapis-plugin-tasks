# Server UI Core cohort qualification

The public Tasks peer now admits Design Core 0.8 alongside 0.7.4. Development
uses the released 0.8 package; Tasks behavior and native service revisions are
unchanged. This supports the shared Notes application-profile/server cohort.

- Initial registry-only check: two type errors from duplicated API identities.
- Explicit Notes archive check: zero Svelte/type findings, 2,892 unit cases
  in 61 files, native tests, build and publint passed; local static build was
  killed with exit 137. Local Docker reports only 3 GB total memory.
- Remote Docker `pnpm validation:all`, run
  `lapis-tasks-run-c2f41ef4-75e9-4c78-91b2-ed3eb3ebd0bb`: check passed;
  2,892 unit cases, 27 Rust cases, build/publint, static Storybook and all
  63 catalog interactions/accessibility cases passed. Specification validation
  and mdBook passed; spec-first identified the missing governance update,
  added with this receipt. The corrected spec gate passes in
  `lapis-tasks-run-0bf6b283-1c89-4c3b-92e1-e296e3c2848c`.
- Release preparation run `lapis-tasks-run-24273423-ea7c-4a99-91fb-11e5b2099160`
  correctly refuses archive-installed dependencies. Its production release
  artifact gate requires a frozen registry graph and remains deferred until
  the authorized upstream release. Public local validation packing uses built
  exports and does not claim that release gate.
- Prerequisites: the immutable Notes archive vector is retained in the run's
  source metadata and installed lock. This is archive acceptance, not a frozen
  registry or published-release qualification.

No publication, push, visual capture or baseline update is authorized. Source
archives and final artifact checks remain separate from actual Server intake.

## Final Core 0.9 cohort

The subsequent published Core 0.9 release changes versioning and release notes
only. The repaired Core owner's 2,854 prepared export files are byte-identical
to its tested 0.8 candidate. Tasks now admits both versions alongside 0.7.4.

Final remote Docker commands `pnpm check`, `pnpm test`, `pnpm build`,
`pnpm publint`, `pnpm build-storybook`, `pnpm test:storybook` and
`pnpm spec:check` all pass with the new Notes archive graph. Type findings remain
zero; 2,892 unit cases, 27 native cases and all 63 Storybook interaction/axe
cases pass. Receipts are retained under `.local/validation/runs`; the final
catalog run is `lapis-tasks-run-a41520c6-54d6-40b4-aa46-7bc975aeb299`, and the
specification run is `lapis-tasks-run-87c12705-def4-49c2-b15d-0f91c34b510e`.

The final source commit is packed for local consumer qualification with built
public exports and checksum/source provenance. Production release artifacts
still require upstream publication, dependency-floor/lock refresh and the
independent frozen-registry gate; the archive guard remains intact.
