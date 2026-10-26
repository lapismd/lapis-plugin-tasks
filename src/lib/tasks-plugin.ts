import { NativeTaskAdapter } from "./model/native-task-adapter";
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
import { createTaskOccurrencesProjectionRegistration } from "./model/task-occurrence";
import {
  createAppDailyDocumentMutationStore,
  TaskOccurrenceRepository,
} from "./model/task-occurrence-repository";
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
import { NativeTaskReferenceStore } from "./model/native-task-reference-store";

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
  private readonly native?: NativeTaskAdapter;
  private readonly nativeReferences?: NativeTaskReferenceStore;
  readonly occurrences: TaskOccurrenceRepository;
  private clockSource: () => Date = () => new Date();
  private data: TasksPluginData = migrateTasksPluginData(null);
  private saveQueue: Promise<void> = Promise.resolve();
  private readonly settingsListeners = new Set<
    (settings: TasksPluginSettings) => void
  >();
  private localDateTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(app: App, pluginManifest: PluginManifest = MANIFEST) {
    super(app, pluginManifest);
    this.nativeReferences = app.nativeTasks
      ? new NativeTaskReferenceStore(app.appDatabase)
      : undefined;
    this.native = app.nativeTasks
      ? new NativeTaskAdapter(app, this.nativeReferences)
      : undefined;
    this.occurrences = new TaskOccurrenceRepository(
      app.appDatabase,
      createAppDailyDocumentMutationStore(app),
      () => this.getSettings().dayParts,
      this.native,
    );
    this.repository = new TaskRepository(
      app.appDatabase,
      createVaultTaskFileStore(app),
      () => this.clock(),
      this.occurrences,
      this.native,
    );
  }

  get clock(): () => Date {
    return this.clockSource;
  }

  set clock(clock: () => Date) {
    this.clockSource = clock;
    this.repository.invalidateEffectiveOccurrences();
  }

  async onload(): Promise<void> {
    this.data = migrateTasksPluginData(await this.loadData());
    if (this.native) {
      if (this.data.nativeTaskRequests) {
        await this.nativeReferences!.importLegacy(this.data.nativeTaskRequests);
        const { nativeTaskRequests: _legacyReferences, ...data } = this.data;
        this.data = data;
        await this.saveData(data);
      }
      await this.native.activate(this.getSettings().dayParts);
      this.registerEvent(
        this.app.dailyDocumentProviders.on("changed", () => {
          void this.native!.configure(this.getSettings().dayParts).catch(
            (error) =>
              this.app.logger.error("Native Task configuration failed", error),
          );
        }),
      );
      this.registerEvent(
        this.app.configuration.on("updated", ({ key }) => {
          if (key.startsWith("dailyNotes."))
            void this.native!.configure(this.getSettings().dayParts).catch(
              (error) =>
                this.app.logger.error(
                  "Native Task configuration failed",
                  error,
                ),
            );
        }),
      );
    } else {
      const invalidateTaskProjectionDate = (file: { path: string }) => {
        if (/\.(?:md|markdown)$/i.test(file.path)) {
          this.repository.invalidateEffectiveOccurrences();
        }
      };
      const metadataChanged = this.app.metadataCache.on(
        "changed",
        invalidateTaskProjectionDate,
      );
      const metadataDeleted = this.app.metadataCache.on(
        "deleted",
        invalidateTaskProjectionDate,
      );
      const metadataLoaded = this.app.metadataCache.on("loaded", () => {
        void this.app.metadataCache.load().then(() => {
          this.repository.invalidateEffectiveOccurrences();
          return this.refreshEffectiveOccurrences();
        });
      });
      this.register(() => {
        this.app.metadataCache.offref(metadataChanged);
        this.app.metadataCache.offref(metadataDeleted);
        this.app.metadataCache.offref(metadataLoaded);
      });
      this.registerIndexProjection(
        createTasksProjectionRegistration(
          createAppTaskStructureResolver(this.app),
          () => todayDateOnly(this.clock()),
        ),
      );
      this.registerIndexProjection(
        createTaskOccurrencesProjectionRegistration(),
      );
      await this.repository.refreshEffectiveOccurrences(
        todayDateOnly(this.clock()),
      );
      await this.materializeTrackedToday();
    }
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
    if (this.native)
      this.addCommand({
        id: "inspect-interrupted-update",
        name: "Inspect interrupted task update",
        callback: () =>
          void import("./native-task-recovery-menu")
            .then(({ openNativeTaskRecovery }) =>
              openNativeTaskRecovery(
                this.app,
                this.native!,
                () => this.nativeReferences!.list(),
                (requestId) => this.nativeReferences!.forget(requestId),
              ),
            )
            .catch((error) =>
              this.app.notifications.notify({
                title: "Task inspection failed",
                message: error instanceof Error ? error.message : String(error),
                severity: "error",
                source: "tasks",
                persist: true,
              }),
            ),
      });
    this.addRibbonIcon("list-todo", "Open Tasks", () => void this.openTasks());
    this.addSettingTab(new TasksSettingsTab(this.app, this));
    registerTasksWorkspaceSettings(this);

    if (!this.native) {
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
  }

  async onunload(): Promise<void> {
    await this.native?.disable();
  }

  private async refreshEffectiveOccurrences(): Promise<void> {
    const today = todayDateOnly(this.clock());
    await this.repository.refreshEffectiveOccurrences(today);
    await this.materializeTrackedToday(today);
  }

  private async materializeTrackedToday(
    today = todayDateOnly(this.clock()),
  ): Promise<void> {
    const tasks = await this.repository.today(today);
    for (const task of tasks) {
      if (
        !task.tracking ||
        task.effectiveOccurrenceState !== "current" ||
        task.effectiveOccurrenceDate !== today
      ) {
        continue;
      }
      const document = await this.repository.getTaskDocument(task.path);
      await this.occurrences.ensure(
        document,
        today as `${number}-${number}-${number}`,
      );
    }
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
      ...this.data,
      version: this.data.version,
      settings: this.getSettings(),
    };
    this.saveQueue = this.saveQueue
      .catch(() => undefined)
      .then(() => this.saveData(snapshot));
    await this.saveQueue;
    await this.native?.configure(this.getSettings().dayParts);
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
