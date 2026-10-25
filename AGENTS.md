# Tasks plugin repository guidance

This repository owns the first-party external Lapis plugin whose runtime ID is
`tasks` and whose package is `@lapis-notes/lapis-plugin-tasks`.

## Ownership and compatibility

- Keep Tasks catalog components, native Tasks CSS, and the plugin runtime
  in this repository.
- Consume host facilities only through published `@lapis-notes/api` and
  `@lapismd/design-core` exports.
- Do not depend on `@stevejuma/ui`, `@lapis-server/*`, Mira, or Lapis Markdown
  in the published runtime. Package Storybook MAY depend on workspace hosts
  and Markdown for `Plugins/Tasks/Shell`.
- Preserve runtime ID `tasks`. Package and repository names do not authorize a
  later vault migration.
- Keep production host registration in Lapis. Hosts load the plugin class;
  `onload` registers the planner view, command, and ribbon. Package Storybook
  owns Tasks catalog and shell acceptance under `Plugins/Tasks/*`;
  Lapis Storybook must not duplicate those stories.

## Application ownership

- First-party runtime and package Storybook code must receive `App` explicitly
  or derive it from the API component context.
- Do not read or assign `globalThis.app`.
- Run `pnpm check:app-ownership` for App-related changes. It is wired into both
  `pnpm check` and `pnpm spec:check`.

## Specification and validation

- Portable validation defaults to Docker through `scripts/validation.mjs`.
  Use the root pnpm commands; Docker failure MUST NOT fall back to the host.
  Follow `docs/validation.md` for contexts, reports and owned cleanup. Native
  diagnosis requires the explicit `LAPIS_TASKS_VALIDATION_RUNTIME=native`
  override. Platform-native qualification and visual approval remain separate.
- Register every new portable command in `scripts/validation/lanes.json`.
  The routing audit rejects unclassified scripts and changed native exceptions.
  Keep tracked manifests/locks on registry semver packages; documented temporary
  archive acceptance is confined to the isolated worker installation.
- Keep every executable story family in `stories/catalog/story-parity.json`.
  Prove its selected render path reaches the actual component or the public
  `WorkspaceShell`; an unused import or metadata component is insufficient.
  Synthetic controls belong inside the padded, dotted `FixtureControls`
  boundary. Application fixtures use its overlay placement. Focused components
  may use inline placement. Do not replace production roots or style private
  production selectors to make a story look correct.
- Keep the fatal Svelte console guard installed through browser teardown.
  Capture original stacks without throwing through framework cleanup, then fail
  post-test and post-file assertions. Do not suppress or allowlist diagnostics.

- Canonical requirements live in `spec/src`; protected implementation changes
  require corresponding canonical specification changes.
- Run `pnpm spec:check`, `pnpm check`, `pnpm test`, `pnpm build` and
  `pnpm publint`, plus Storybook interaction, accessibility and static-build
  checks when stories or presentation change.
- Consume published LapisMD dependencies through normal npm semver ranges.
  Unpublished first-party Lapis host packages remain development-only until
  their own publication plan is complete.
- Treat visual status separately from functional validation. Never create or
  replace Visual Delta baselines without explicit approval.

## Version control

- Use Jujutsu for status, diffs, commits, bookmarks, and history work.
- Preserve unrelated work and keep each change independently verifiable.
- After each verified change, run `jj commit` with a PR-quality message that
  explains what changed, why it changed, and the validation that passed. Keep
  the message descriptive enough for review context rather than using a terse
  label. This is a standing request; do not wait for the user to ask.
