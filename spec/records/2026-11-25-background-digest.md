# Tasks background overdue digest

LN-TASK-100/101 add a disabled-by-default daily job with metadata-read and Lapis
notification permissions only. The self-contained headless handler reuses the
retained Review matcher and recurrence evaluation. It scans every metadata page,
uses the scheduled local date, stays quiet for empty results and checkpoints only
after notification. Failure or cancellation cannot publish a partial count.

## Source qualification

All executable qualification used Docker context `omarchy`.

- Four focused digest regressions passed. The recurrence fixture now explicitly
  declares its start date and verifies the future effective occurrence is excluded
  from Review; the digest reports the one truly overdue task.
- Registry-only `pnpm validation:all` passed all aggregate lanes: check, test,
  build, publint, static Storybook, interactions/axe, spec, npm preparation,
  registry tests, media checks, bundle preparation and runtime acceptance.
- Unit acceptance: 2,987 tests across 74 files; interaction/accessibility:
  67 cases across the three declared batches (15 + 10 + 42).
- Development and production archive hosts mounted the actual Tasks plugin,
  planner, details and Markdown composer and passed teardown.
- The complete self-contained handler is 330,234 bytes, SHA256
  `fa4157da9fbabe9c55fd7d34860bb6de4da085fa9c236441fe54a370429b0c27`.
  Its bytes match the independently qualified native QuickJS 16 MiB acceptance.

The full registry-only source was
`84e8e98f0d5a272f656b3a3ebe38b81ac5fcdb93`, pack SHA256
`dcebd3713b66fe4db39c3135a0d0f6e070022a6a22fe6abd17549200a92644f1`,
run `lapis-tasks-run-9506870c-eb9a-4f80-8605-cee9529bca60`.
API `^0.6.15` and Workspace `^0.4.11` resolved from the registry; no development
archive overlay was used. The runner reported status `passed` and exit code 0.

## Retained attempts and delivery gates

The first registry-only install rejected a stale temporary pnpm-hook checksum.
Regenerating the lock with `--ignore-pnpmfile` restored the frozen install.
The first unit run then found one expired audit-proposal graph binding mismatch
(2,986 passed, one failed). Existing governed binding fields were refreshed;
the exact seven proposal tests and the complete unit suite passed. Proposal
status, authority and expiry remain unchanged; no audit approval was granted.

Local extraction of the successful full report exhausted disk. The complete
report tar and result were preserved, duplicate extracted files were checked
against that archive, and the archive was losslessly compressed with its original
SHA256 receipt. This collection failure did not rerun or waive any test.

Publication, signed catalog delivery and installed acceptance in both Desktop and
Server remain separate gates. Visual baselines were not changed.
