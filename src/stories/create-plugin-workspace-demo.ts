import {
  App,
  installApplicationCompatibility,
  MemoryAppDatabase,
  MemoryVaultAdapter,
  registerDefaultDailyDocumentProvider,
} from "@lapis-notes/api";
import { FileExplorerPlugin } from "@lapis-notes/file-explorer";
import { MarkdownPlugin } from "@lapis-notes/markdown";
import { SearchPlugin } from "@lapis-notes/search";

import { TasksPlugin } from "../lib";
import {
  PLANNER_FIXTURE_TODAY,
  plannerWorkspaceMarkdownFixtures,
} from "../lib/model/planner-fixtures";

function leaf(
  id: string,
  title: string,
  icon: string,
  type: string,
  state: Record<string, unknown> = {},
) {
  return {
    id,
    type: "leaf",
    state: { type, state, icon, title },
  };
}

function workspaceLayout() {
  return {
    main: {
      id: "main",
      type: "split",
      direction: "vertical",
      sizes: [100],
      children: [
        {
          id: "tasks-tabs",
          type: "tabs",
          stacked: false,
          currentTab: 0,
          children: [leaf("tasks-home", "Tasks", "list-todo", "tasks")],
        },
      ],
    },
    left: {
      id: "left",
      type: "split",
      direction: "vertical",
      sizes: [100],
      children: [
        {
          id: "left-tabs",
          type: "tabs",
          stacked: false,
          currentTab: 0,
          children: [
            leaf("file-explorer", "Files", "folder-closed", "file-explorer"),
          ],
        },
      ],
      width: "16rem",
    },
    right: {
      id: "right",
      type: "split",
      direction: "vertical",
      sizes: [100],
      children: [
        {
          id: "right-tabs",
          type: "tabs",
          stacked: false,
          currentTab: 0,
          children: [leaf("search", "Search", "search", "search")],
        },
      ],
      width: "0px",
    },
    bottom: {
      id: "bottom",
      type: "tabs",
      currentTab: 0,
      children: [],
      height: "0px",
    },
    floating: [],
    active: "tasks-home",
  };
}

export function createPluginWorkspaceSeed(
  navigationPath: string | null = "lists.md",
): Record<string, string> {
  return {
    ".lapis/app.json": JSON.stringify(
      {
        "editor.defaultViewForNewTabs": "editing",
        "editor.alwaysFocusNewTabs": true,
        "appearence.interface.showTabTitleBar": true,
        "workspace.fileExplorer.autoRevealCurrentFile": true,
      },
      null,
      2,
    ),
    ".lapis/workspace.json": JSON.stringify(workspaceLayout(), null, 2),
    ...Object.fromEntries(
      plannerWorkspaceMarkdownFixtures.flatMap((fixture) => {
        if (fixture.path !== "lists.md") return [[fixture.path, fixture.raw]];
        return navigationPath ? [[navigationPath, fixture.raw]] : [];
      }),
    ),
  };
}

export async function bootPluginWorkspaceDemo(
  navigationPath: string | null = "lists.md",
): Promise<{
  app: App;
  dispose: () => Promise<void>;
}> {
  const app = new App({
    version: "0.0.1-story",
    configPath: ".lapis/app.json",
    adapter: new MemoryVaultAdapter(createPluginWorkspaceSeed(navigationPath), {
      name: "Tasks Plugin Workspace",
      vaultId: "tasks-plugin-workspace",
      clock: 1_700_000_000_000,
    }),
    appDatabase: new MemoryAppDatabase("tasks-plugin-workspace"),
    workspaceShell: { application: { name: "Lapis Notes" } },
    markdownRenderer: async () => {},
  });
  const disposeApplicationCompatibility = installApplicationCompatibility(app);
  const dailyDocumentProvider = registerDefaultDailyDocumentProvider(app);

  app.plugins.registerCorePlugins([
    {
      plugin: MarkdownPlugin,
      required: false,
      enabledByDefault: true,
    },
    {
      plugin: FileExplorerPlugin,
      required: false,
      enabledByDefault: true,
    },
    { plugin: SearchPlugin, required: false, enabledByDefault: true },
    {
      plugin: TasksPlugin,
      required: false,
      enabledByDefault: true,
      distribution: "first-party-external",
    },
  ]);

  await app.vault.load();
  await app.configuration.load();
  await app.plugins.loadPlugins({
    communityPlugins: "disabled",
    optionalCorePlugins: "configured",
  });
  const tasksPlugin = app.plugins.plugins.get("tasks");
  if (!(tasksPlugin instanceof TasksPlugin)) {
    throw new Error(
      "The Tasks workspace fixture could not resolve TasksPlugin.",
    );
  }
  tasksPlugin.clock = () => new Date(`${PLANNER_FIXTURE_TODAY}T12:00:00`);
  const stopWatchingMetadata = app.metadataTypeManager.trackChanges();
  await app.metadataCache.load();
  const searchPlugin = app.plugins.plugins.get("search");
  if (searchPlugin instanceof SearchPlugin) {
    await searchPlugin.refreshIndex("tasks-plugin-workspace");
  }
  await app.workspace.loadLayout();

  return {
    app,
    dispose: async () => {
      stopWatchingMetadata();
      for (const plugin of [...app.plugins.corePlugins].reverse()) {
        await plugin.disable().catch(() => undefined);
      }
      await app.workspace.disposeWorkspaceHost();
      await app.appDatabase.close();
      dailyDocumentProvider.dispose();
      disposeApplicationCompatibility();
    },
  };
}
