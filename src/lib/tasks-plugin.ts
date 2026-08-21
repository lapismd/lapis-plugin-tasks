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
import { todayDateOnly } from "./model/task-dates";

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
  private localDateTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(app: App, pluginManifest: PluginManifest = MANIFEST) {
    super(app, pluginManifest);
    this.repository = new TaskRepository(
      app.appDatabase,
      createVaultTaskFileStore(app),
      () => this.clock(),
    );
  }

  async onload(): Promise<void> {
    this.data = migrateTasksPluginData(await this.loadData());
    this.registerIndexProjection(
      createTasksProjectionRegistration(createAppTaskStructureResolver(this.app)),
    );
    await this.repository.refreshEffectiveOccurrences(
      todayDateOnly(this.clock()),
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

    if (typeof document !== "undefined") {
      this.registerDomEvent(document, "visibilitychange", () => {
        if (document.visibilityState === "visible") {
          void this.refreshEffectiveOccurrences();
        }
      });
    }
    if (typeof window !== "undefined") {
      this.registerDomEvent(window, "focus", () => {
        void this.refreshEffectiveOccurrences();
      });
      this.registerDomEvent(window, "pageshow", () => {
        void this.refreshEffectiveOccurrences();
      });
    }
    this.scheduleLocalDateRefresh();
    this.register(() => {
      if (this.localDateTimer) clearTimeout(this.localDateTimer);
      this.localDateTimer = null;
    });
  }

  private async refreshEffectiveOccurrences(): Promise<void> {
    await this.repository.refreshEffectiveOccurrences(
      todayDateOnly(this.clock()),
    );
  }

  private scheduleLocalDateRefresh(): void {
    if (this.localDateTimer) clearTimeout(this.localDateTimer);
    const now = this.clock();
    const nextLocalDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const delay = Math.max(1, nextLocalDate.getTime() - now.getTime() + 50);
    this.localDateTimer = setTimeout(() => {
      this.localDateTimer = null;
      void this.refreshEffectiveOccurrences().finally(() =>
        this.scheduleLocalDateRefresh(),
      );
    }, delay);
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
