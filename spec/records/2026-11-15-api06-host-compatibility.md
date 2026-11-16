# Tasks API 0.6 host compatibility

Starting source: `f3f87dab570bfb0b1f88d74a3ed37c1395ccf8d4`.

Desktop's strict transitive archive admission rejected its old Tasks 0.1.0
fixture because API 0.6.5 does not satisfy that fixture's `^0.1.4` peer.
Current Tasks 0.2.0 source also admitted only `^0.2.4 || ^0.4.0`.
The exact metadata diagnostic, `pnpm --dir ../lapis-desktop exec semver 0.6.5
-r <current API peer>`, changed from exit 1 (0/1 admitted) to exit 0 (1/1).
This is package admission evidence, not application qualification.

The peer contract adds `^0.6.0` and retains both earlier families. Development
selects published API 0.6.5 and compatible Workspace, UI, Explorer, Markdown,
Search and Core 0.13.4. Runtime ID, data formats, native algorithms and host
authority are unchanged. A patch Changeset requests no package publication.

## Cold theme regression

The first full catalog shard stopped at 41 passes and one failure. The exact
reproduction was:

```sh
pnpm test:storybook -- src/stories/PluginWorkspace.stories.svelte -t NestedListRows
```

It failed 0/1 in `cf7bf099-6dff-461d-bb11-5c1276eda64c`; the diagnostic
reproduction also failed in `28adc066-4004-41d6-9c03-2c43ef35c3a7`.
The rendered guide was teal `rgb(15,118,110)`, while the workspace focus token
was purple `#9873f7`, and there was no owning Mira theme boundary.

Markdown deliberately inherits its parent's palette after `a76d286a`, under
LN-MD-065/LN-MD-101. Tasks owns the complete document surface and now establishes
its Obsidian palette before mounting the public provider. There is no provider
wrapper or CSS override. All original theme-marker and computed-color assertions
remain unchanged; the temporary diagnostic was removed.

The exact cold target now passes 1/1 in
`6a46fb44-8f40-4fbf-9e07-75d11872ea8e`. The other 24 cases were unselected by
the explicit test-name selector, then included in the full catalog run.

## Qualification

The governed Docker runner uses context `omarchy`, SSH transport, 4 CPUs,
12 GiB memory and 2 GiB shared memory. No host fallback is selected.
`pnpm validation:all` has passed check/Svelte (zero errors or warnings), strict
native and 17-operation checks, 2,926 unit cases in 65 files, 29 Rust cases
with zero ignored, build, publint, static Storybook, and all 66 cold
interaction/accessibility cases (15 + 9 + 42). Four catalog files contain no
executable tests. Specification, npm preparation and 23 registry-tool tests also
pass. All registry media assets verified without changes, and cold development and
production archive hosts passed actual plugin load, planner, details, Markdown
composer and teardown. The complete aggregate passes in
`2397be28-40ca-4be7-a1a5-22ff36331487`.

`pnpm audit --json` exits 0 with no advisory records; its metadata reports one
low issue under the existing checked-in audit policy. Production audit exits 0.
No ignore changed. Initial spec search required tool bootstrap and indexing.
Final search under the task's Node 24 resolves the owning contracts, and doctor
reports ten passes plus the existing alias warning. Spec Validator remains the
Deno-free 0.2.0 release.

Downstream Desktop archive adoption, native application acceptance, publication
and visual approval remain separate gates. No visual baselines changed.

Before submission, remote main advanced to `b5ee4eb7` through CI version-PR
authentication work. This private change was rebased without changing runtime
inputs. The sole conflict was the reformatted verification row: current main's
other rows were retained, then LN-TASK-001 received this slice's evidence.
Combined checks pass in `ec9636ab-482e-42ca-8a65-cb867c91c23a`;
2,929 unit cases in 66 files pass in `32e9ce37-c38a-42c1-bb99-8c197003a86b`
(including three new upstream CI authentication cases). All 29 Rust cases pass
again. Specification passes in `e1a52f56-48d4-4ca3-a232-11bb64ca01dd`.
Runtime and catalog inputs match the fully qualified aggregate above.
