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

- Canonical requirements live in `spec/src`; protected implementation changes
  require corresponding canonical specification changes.
- Run `pnpm spec:check`, `pnpm check`, `pnpm test`, `pnpm build`, `pnpm
  publint`, and Storybook interaction, accessibility, and static-build checks
  when stories or presentation change.
- Consume colocated siblings through `link:`-valued workspace-level overrides.
- Treat visual status separately from functional validation. Never create or
  replace Visual Delta baselines without explicit approval.

## Version control

- Use Jujutsu for status, diffs, commits, bookmarks, and history work.
- Preserve unrelated work and keep each change independently verifiable.
- After each verified change, run `jj commit` with a PR-quality message that
  explains what changed, why it changed, and the validation that passed. Keep
  the message descriptive enough for review context rather than using a terse
  label. This is a standing request; do not wait for the user to ask.
