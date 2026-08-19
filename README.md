# Tasks for Lapis

`@lapis-notes/lapis-plugin-tasks` is the first-party external Tasks plugin for
Lapis. This slice ships a stub runtime and a Design Core-backed catalog. Hosts
do not load it yet.

The runtime plugin ID is `tasks`.

## Development

Colocated LapisMD checkouts link matching semver versions through pnpm. Package
manifests contain no workspace or machine-specific dependency ranges.

```sh
pnpm install
pnpm spec:check
pnpm check
pnpm test
pnpm build
pnpm test:storybook
pnpm build-storybook
```

Package Storybook defaults to port 7030.
