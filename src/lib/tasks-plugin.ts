import {
  Plugin,
  type App,
  type PluginManifest,
  type WorkspaceLeaf,
} from "@lapis-notes/api";
import {
  createAppTaskStructureResolver,
  createTasksProjectionRegistration,
} from "./model/task-index";
import { TaskRepository } from "./model/task-repository";
import { createVaultTaskFileStore } from "./model/vault-task-file-store";
import {
  cloneTasksPluginSettings,
  migrateTasksPluginData,
  patchTasksPluginSettings,
  type TasksPluginData,
  type TasksPluginSettings,
  type TasksPluginSettingsPatch,
} from "./tasks-settings";
import { TasksSettingsTab } from "./tasks-settings-tab";
import { registerTasksWorkspaceSettings } from "./register-tasks-settings";
import { TASKS_VIEW_TYPE, TasksView } from "./tasks-view";
import { createTaskStructureMarkdownContribution } from "./task-list-markdown-extension";

export const TASKS_PLUGIN_ID = "tasks";

const MANIFEST: PluginManifest = {
  id: TASKS_PLUGIN_ID,
  name: "Tasks",
  version: "0.1.0",
  minAppVersion: "0.0.1",
  description: "Vault-native Tasks planner, indexing, and queries.",
  author: "Lapis Notes",
};

export class TasksPlugin extends Plugin {
  readonly repository: TaskRepository;
  clock: () => Date = () => new Date();
  private data: TasksPluginData = migrateTasksPluginData(null);
  private saveQueue: Promise<void> = Promise.resolve();
  private readonly settingsListeners = new Set<(settings: TasksPluginSettings) => void>();

  constructor(app: App, pluginManifest: PluginManifest = MANIFEST) {
    super(app, pluginManifest);
    this.repository = new TaskRepository(
      app.appDatabase,
      createVaultTaskFileStore(app),
    );
  }

  async onload(): Promise<void> {
    this.data = migrateTasksPluginData(await this.loadData());
    this.registerIndexProjection(
      createTasksProjectionRegistration(createAppTaskStructureResolver(this.app)),
    );
    this.registerMarkdownExtension(
      createTaskStructureMarkdownContribution(this.app, this.repository),
    );
    this.registerView(
      TASKS_VIEW_TYPE,
      (leaf: WorkspaceLeaf) =>
        new TasksView(leaf, this.repository, () => this.clock(), {
          get: () => this.getSettings(),
          update: (patch) => this.updateSettings(patch),
          subscribe: (listener) => this.subscribeSettings(listener),
        }),
    );
    this.addCommand({
      id: "open",
      name: "Open tasks",
      callback: () => void this.openTasks(),
    });
    this.addRibbonIcon("list-todo", "Open Tasks", () => void this.openTasks());
    this.addSettingTab(new TasksSettingsTab(this.app, this));
    registerTasksWorkspaceSettings(this);
  }

  getSettings(): TasksPluginSettings {
    return cloneTasksPluginSettings(this.data.settings);
  }

  async updateSettings(patch: TasksPluginSettingsPatch): Promise<void> {
    this.data = {
      ...this.data,
      settings: patchTasksPluginSettings(this.data.settings, patch),
    };
    const snapshot: TasksPluginData = {
      version: this.data.version,
      settings: this.getSettings(),
    };
    this.saveQueue = this.saveQueue
      .catch(() => undefined)
      .then(() => this.saveData(snapshot));
    await this.saveQueue;
    for (const listener of this.settingsListeners) {
      listener(cloneTasksPluginSettings(snapshot.settings));
    }
  }

  subscribeSettings(
    listener: (settings: TasksPluginSettings) => void,
  ): () => void {
    this.settingsListeners.add(listener);
    return () => this.settingsListeners.delete(listener);
  }

  async openTasks(): Promise<void> {
    const leaf =
      this.app.workspace.getLeavesOfType(TASKS_VIEW_TYPE)[0] ??
      this.app.workspace.getLeaf();
    if (leaf.view.getViewType() !== TASKS_VIEW_TYPE) {
      await leaf.setViewState({ type: TASKS_VIEW_TYPE, active: true });
    }
    this.app.workspace.activeLeaf = leaf;
    await this.app.workspace.revealLeaf(leaf);
  }
}

export default TasksPlugin;
