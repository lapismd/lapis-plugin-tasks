import {
  Plugin,
  type App,
  type PluginManifest,
} from "@lapis-notes/api";
import { createTasksProjectionRegistration } from "./model/task-index";

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
    this.registerIndexProjection(createTasksProjectionRegistration());
  }
}

export default TasksPlugin;
