# Tasks Plugin

`@lapis-notes/lapis-plugin-tasks` owns the first-party external Tasks catalog
and a stub plugin runtime. Vault persistence, views, commands, and host
registration remain planned. Reusable leaf controls come from public Design
Core APIs. The `Plugins/Tasks/Panels` catalog story composes planner
navigation, planner body, and task detail with Design Core Column Canvas.
That presentation is not a host movable-panel runtime; LN-TASK-010 remains
Planned for vault views, commands, and movable panels.

## Requirements

| ID | Requirement |
| --- | --- |
| LN-TASK-001 | The standalone repository MUST ship `@lapis-notes/lapis-plugin-tasks` as a versioned first-party external package whose runtime manifest id is `tasks`, distribution is `first-party-external`, provenance is `official`, and `enabledByDefault` is `false`. |
| LN-TASK-002 | `TasksPlugin` MUST extend the public API `Plugin` surface. `onload` MUST NOT register views, commands, settings tabs, or plugin data in this stub slice. |
| LN-TASK-003 | Production and Storybook source MUST receive `App` explicitly or from API context and MUST NOT read or assign `globalThis.app`. |
| LN-TASK-004 | The package MUST own the adapted Tasks catalog components and native `--ui-tasks-*` CSS. Reusable leaf controls MUST come from public `@lapismd/design-core` exports. |
| LN-TASK-005 | The package MUST NOT depend on `@stevejuma/ui`, `@lapis-server/*`, `/Users/stevejuma/code/cv`, `@cvstudio/*`, `@lapismd/mira`, or Lapis Markdown. |
| LN-TASK-006 | Package Storybook MUST run on port 7030, fail `pnpm test:storybook` on axe violations, and keep changed visual stories `visual-pending`. |
| LN-TASK-007 | Desktop and web hosts MUST NOT register or load this plugin until a later Lapis requirement authorizes host cutover. |
| LN-TASK-008 | The public package export MUST include `TasksPlugin` and the catalog components. It MUST NOT re-export Design Core `TaskDueCalendar`. |
| LN-TASK-009 | Autodocs Show Code MUST use public `@lapis-notes/lapis-plugin-tasks` imports, not story-only harness wrappers. |
| LN-TASK-010 | Vault task files, workspace views, commands, and movable panels MUST remain unspecified for this stub and MUST NOT be invented in source. |
| LN-TASK-011 | CV-only `applicationId`, `linkedTo`, and `JobApplication` shapes MUST stay in catalog model fixtures and MUST NOT become canonical Task resource types. |
| LN-TASK-012 | Package Storybook MUST include a `Plugins/Tasks/Panels` Column Canvas composition of planner navigation, planner body, and closeable task detail without `AppShell`. Additional closeable columns MAY open from the selected task. This catalog canvas MUST consume public Design Core `column-canvas`, MUST fill the Storybook viewport without page-level scrollbars, MUST use the App Shell sidebar surface, MUST render the leading Tasks column without a column border so it blends into that surface, MUST keep the planner column’s start corners complete, MUST mount task detail directly in the detail column without an extra story wrapper, MUST place the Tasks resize handle on the planner column’s start border with no gap between those two columns, and MUST NOT register host movable panels. |
