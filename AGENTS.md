# Tasks plugin repository guidance

This repository owns the first-party external Lapis plugin whose runtime ID is
`tasks` and whose package is `@lapis-notes/lapis-plugin-tasks`.

## Ownership and compatibility

- Keep Tasks catalog components, native Tasks CSS, and the stub plugin runtime
  in this repository.
- Consume host facilities only through published `@lapis-notes/api` and
  `@lapismd/design-core` exports.
- Do not depend on `@stevejuma/ui`, `@lapis-server/*`, Mira, or Lapis Markdown
  in this stub slice.
- Preserve runtime ID `tasks`. Package and repository names do not authorize a
  later vault migration.
- Keep production host registration in Lapis. Hosts load this plugin for
  indexing and queries only; `onload` must not register workspace views.
  Package Storybook owns Tasks catalog acceptance under `Plugins/Tasks/*`;
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
- After each verified slice, commit with a PR-quality message. This is a
  standing request; do not wait for the user to ask.
