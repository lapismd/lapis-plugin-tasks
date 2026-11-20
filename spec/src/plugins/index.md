# Plugins

The standalone catalog groups each externally distributed plugin beneath its
plugin name. Tasks is the package's only plugin.

## Requirements

| ID | Requirement |
| --- | --- |
| LPT-SPEC-010 | Canonical plugin specification chapters and their Storybook mirrors MUST use the `Plugins / <Plugin>` hierarchy and matching relative paths. Storybook story titles MUST use `Plugins/<Plugin>/*`. |

## Current development catalog

These managed facts describe only the Core development catalog. Public runtime
contracts and every normal validation and publication gate remain independent.

<!-- dependency-intake:core-development:start -->

```json
{
  "schemaVersion": 1,
  "kind": "development-dependency-intake",
  "dependency": "@lapismd/design-core",
  "version": "0.13.7",
  "peer": "^0.13.2",
  "integrity": "sha512-oJXRalyUybTYYK1wJG++zaEQk2GoRgt4GubMKXmQaSSBTH5senGHxT3dBlvMnKAH0MzpMhlRcDMhCtTGvjPZ0w==",
  "importers": {
    ".": {
      "specifier": "0.13.7",
      "version": "0.13.7(svelte@5.56.10)(tailwindcss@4.1.12)"
    }
  },
  "policySha256": "d36b49de0dfaee07e8ef1c245dd263b5f0065ccc7b085aa2d311a1c21a2fd460"
}
```

<!-- dependency-intake:core-development:end -->
