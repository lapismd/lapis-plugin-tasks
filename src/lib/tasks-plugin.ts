import {
  Plugin,
  type App,
  type PluginManifest,
  type WorkspaceLeaf,
} from "@lapis-notes/api";
import { createTasksProjectionRegistration } from "./model/task-index";
import { TaskRepository } from "./model/task-repository";
import { createVaultTaskFileStore } from "./model/vault-task-file-store";
import { TASKS_VIEW_TYPE, TasksView } from "./tasks-view";

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

  constructor(app: App, pluginManifest: PluginManifest = MANIFEST) {
    super(app, pluginManifest);
    this.repository = new TaskRepository(
      app.appDatabase,
      createVaultTaskFileStore(app),
    );
  }

  async onload(): Promise<void> {
    this.registerIndexProjection(createTasksProjectionRegistration());
    this.registerView(
      TASKS_VIEW_TYPE,
      (leaf: WorkspaceLeaf) =>
        new TasksView(leaf, this.repository, () => this.clock()),
    );
    this.addCommand({
      id: "open",
      name: "Open tasks",
      callback: () => void this.openTasks(),
    });
    this.addRibbonIcon("list-todo", "Open Tasks", () => void this.openTasks());
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
