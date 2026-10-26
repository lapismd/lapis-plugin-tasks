# Admitted native Tasks observer adapter

Base: Tasks `49ed2c1369326adfa7f091dd7c6c041801e329ad`. This source slice
implements LN-TASK-094/095 against the public Notes native Tasks port. Notes
owns admitted work, checked writes, daily policy, journal and scheduling. Tasks
retains its existing views, queries and explicit standalone browser path.

The source adapter delegates supported mutations, complete/skip and daily
observations, deriving the expected version from exact source bytes. It never
persists a returned replacement or publishes a competing native projection.
Native mode skips renderer projection registration/repair, proactive daily
materialization and local-date timers. Configuration and explicit disable are
serialized; later activation is explicit. Passive App detach skips disable.

The exact command is `pnpm test -- src/lib/model/native-task-adapter.test.ts
src/lib/tasks-native-lifecycle.test.ts`, run through the standard frozen Docker
worker. It passes **nine unit cases plus all fourteen native cases** at
`4d6b64f837fdf03af8ba0171a7c3e0a09f320a61` (run `15a09980`). Tests retain a
lost response's request identity, known/partial failures and explicit refusal
metadata, without retry/fallback. They prove no renderer write, projection,
daily ensure or timer, existing view registration, ordered disable, reactivation
and passive detach.

Complete source qualification is active. Its first governance gate exposed two
verification rows outside the table; both are moved into the existing table.
The next package check exposed nine missing App-property diagnostics in the
owning API's checked-in declaration. Notes repaired that declaration and added
an App-owned packed contract, rather than adding a consumer shim. The corrected
five-package pack passes at `a14c0098`; this temporary source cohort includes the
qualified Design Core picker archive `0d7a9289` and normal registry manifests.
Remote SSH setup failures retain their logs and never use a host fallback.

Both actual host selections, signed installed-bundle/native-screen acceptance,
publication and distribution remain separate. The API captures the existing
Luxon context; unsupported locale contexts and custom/ambiguous daily providers
remain explicit. Common locale/locale-invariant format parity, particularly
`en-GB`, is still required before default native host cutover.

## Completed source gates

At `610660900c9f2ba5133d99e0e13caaf5055efd8b`, the complete standard
`validation:all` worker (`0863593f`) passes check, all **2,859 unit cases**, all
**14 native cases**, build, publint, static Storybook and all **62 cold
Storybook interaction/accessibility cases** (14 + 8 + 40). All functional and
accessibility failures are zero. The final specification stage identified one
missing mapped index chapter; its host-selection description is now updated.
Final document/specification qualification is recorded separately, without
repeating unchanged product suites. Visual baselines remain unchanged.

Final canonical qualification passes at `624391a9` (run `b896822c`): validation, mdBook, mapped spec-first, ownership and routing/composition audits all pass. The current production `src` tree is unchanged from the complete product run. Source qualification is complete; application/bundle/default and distribution gates remain separate.
