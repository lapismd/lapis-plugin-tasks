import { View, type WorkspaceLeaf } from "@lapis-notes/api";
import { mount, unmount } from "svelte";
import type { TaskRepository } from "./model";
import TasksWorkspace from "./tasks-workspace.svelte";

export const TASKS_VIEW_TYPE = "tasks";

export class TasksView extends View {
  private component: Record<string, unknown> | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly repository: TaskRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {
    super(leaf);
  }

  getViewType(): string {
    return TASKS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Tasks";
  }

  getIcon(): string {
    return "list-todo";
  }

  protected onOpen(): Promise<void> {
    return Promise.resolve();
  }

  protected onClose(): Promise<void> {
    return Promise.resolve();
  }

  onload(): void {
    this.containerEl.style.width = "100%";
    this.containerEl.style.height = "100%";
    this.containerEl.style.minHeight = "0";
    this.containerEl.style.overflow = "hidden";
    this.component = mount(TasksWorkspace, {
      target: this.containerEl,
      props: {
        app: this.app,
        repository: this.repository,
        now: this.clock(),
      },
    }) as Record<string, unknown>;
  }

  onunload(): void {
    if (this.component) void unmount(this.component);
    this.component = null;
  }
}
