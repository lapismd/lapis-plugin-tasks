# Lists heading actions

The Lists heading now places a compact Pencil action immediately before New
list. The Plus icon is centered over the List count chips, with the same
sidebar hover and keyboard-focus treatment as the existing navigation actions.
Both actions remain available from the collapsed Lists popover.

The workspace resolves the authoritative navigation document through
`repository.navigation()`, flushes pending Tasks file surfaces, and opens that
file in the host Markdown live-preview editor. Public leaf routing brings the
editor tab to the foreground and reuses an already-open document. The popover
closes on edit. When no navigation document exists, Edit is omitted and New
list remains functional. No host, Design Core, or Markdown implementation was
changed.

## Regression evidence

The original target was:

```sh
pnpm exec vitest run --config scripts/vitest-storybook-batches.config.mjs \
  --project storybook src/stories/PluginWorkspace.stories.svelte \
  -t ListsHeadingActions
```

Before the layout change, this failed one story: the Plus center was 8px beyond
the count-chip centers. An initial test setup also queried chips before the
workspace projection had rendered; it now awaits that existing readiness
boundary. The first implementation exposed a hidden newly-opened editor tab;
the final action explicitly opens and reveals its owned host leaf. The popover
assertion uses the public content host rather than assuming a dialog role.

Final focused acceptance passes three stories with zero functional or enabled
axe failures:

```sh
pnpm exec vitest run --config scripts/vitest-storybook-batches.config.mjs \
  --project storybook src/stories/PluginWorkspace.stories.svelte \
  -t 'ListsHeadingActions|ListsNavigationSourceSelection|ListsWithoutNavigationDocument'
```

Source-path and absent-document cases are seeded before metadata indexing in
fresh Apps. An exploratory setup that renamed an already-indexed fixture did
not remove its prior projection through a bulk cache load; the final setup
tests the source-selection contract directly during ordinary host startup.
The geometry, visibility, full Markdown source, action order, focus feedback,
and successful file-creation assertions remain intact.

## Wider validation

Final source validation passed:

- `pnpm spec:check`, `pnpm check`, `pnpm build`, and `pnpm publint` passed.
  Svelte reported zero errors and warnings; App ownership, native CSS, and types
  passed.
- `pnpm test` passed all 201 tests in 37 files.
- `node scripts/test-storybook-batches.mjs` passed all 62 stories
  (14 + 8 + 40) across 19 files, retaining four existing metadata-only skips.
  Zero functional or enabled axe failures remain.
- `pnpm build-storybook` passed; its production preview built in 1 minute
  3 seconds.
- The three focused stories also passed against rebuilt `dist/index.js`.
  The complete real-App Shell file then passed all 24 stories against that
  built public plugin export, including desktop and mobile surfaces.

Built-output consumer acceptance used the temporary configuration
`/tmp/tasks-lists-heading-dist-vitest.config.mjs`. It selects `dist/index.js`
for the workspace boot's plugin import and the matching generated file-surface
registry for internal story helpers. It changes no committed dependency
manifest, lockfile, loader configuration, or product source. The full command
was:

```sh
pnpm exec vitest run --config /tmp/tasks-lists-heading-dist-vitest.config.mjs \
  --project storybook src/stories/PluginWorkspace.stories.svelte
```

Storybook was restarted on port 7030. Its cold heading-action play completed;
native pointer review measured zero center offset and a visible hover background
of `rgb(227, 227, 227)` under the Lapis light theme. Clicking Edit reopened the
existing `lists.md` tab in editable Markdown live preview. The review image is
`tasks-lists-heading-actions.png` in the current Codex visualization directory.

Pre-existing package manifest and lockfile edits are excluded from this slice.
Stories remain `visual-pending`; no screenshot comparisons or visual baselines
were updated. Registry publication and native packaged qualification were not
performed.
