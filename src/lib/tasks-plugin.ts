import { Plugin, type App, type PluginManifest } from "@lapis-notes/api";

export const TASKS_PLUGIN_ID = "tasks";

const MANIFEST: PluginManifest = {
  id: TASKS_PLUGIN_ID,
  name: "Tasks",
  version: "0.1.0",
  minAppVersion: "0.0.1",
  description: "Vault-native Tasks catalog stub.",
  author: "Lapis Notes",
};

export class TasksPlugin extends Plugin {
  constructor(app: App, pluginManifest: PluginManifest = MANIFEST) {
    super(app, pluginManifest);
  }

  async onload(): Promise<void> {
    // Stub: catalog-only in this slice. No views, commands, or plugin data.
  }
}

export default TasksPlugin;
