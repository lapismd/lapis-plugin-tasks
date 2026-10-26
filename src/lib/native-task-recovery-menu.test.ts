import { describe, expect, it, vi } from "vitest";
import type { App } from "@lapis-notes/api";
import type { NativeTaskOperation } from "@lapis-notes/api/native-tasks";

const menus = vi.hoisted(
  () =>
    [] as Array<{ choices: Array<{ label: string; choose(): Promise<void> }> }>,
);
vi.mock("@lapis-notes/api", () => ({
  Menu: class {
    choices: Array<{ label: string; choose(): Promise<void> }> = [];
    popover() {
      return this;
    }
    setTitle() {
      return this;
    }
    addItem(callback: (item: unknown) => void) {
      const choice = { label: "", choose: async () => {} };
      const item = {
        setTitle(label: string) {
          choice.label = label;
          return this;
        },
        setIcon() {
          return this;
        },
        onClick(choose: () => Promise<void>) {
          choice.choose = choose;
          return this;
        },
      };
      callback(item);
      this.choices.push(choice);
      return this;
    }
    showAtPosition() {
      menus.push(this);
    }
  },
}));
import { openNativeTaskRecovery } from "./native-task-recovery-menu";

describe("existing Tasks recovery picker", () => {
  it("inspects a reloaded identity read-only and exposes current-file navigation and explicit forgetting", async () => {
    menus.length = 0;
    const reference = {
      requestId: "d5ab7890-0000-4000-8000-000000000001",
      path: "Task.md",
      action: "skip",
      at: "2026-10-26T09:00:00Z",
    };
    const operation = {
      disposition: "completed",
      daily: { path: "daily/2026-10-26.md" },
      last_failure: null,
    } as NativeTaskOperation;
    const inspect = vi.fn(async () => operation);
    const save = vi.fn(async () => {});
    const openFile = vi.fn(async () => {});
    const notify = vi.fn();
    const app = {
      notifications: { notify },
      vault: { getFileByPath: (path: string) => ({ path }) },
      workspace: {
        getLeaf: vi.fn(() => ({ openFile })),
        getCommandHostDocument: () => ({ defaultView: { innerWidth: 800 } }),
      },
    } as unknown as App;
    openNativeTaskRecovery(app, { inspect }, () => [reference], save);
    await menus[0]!.choices[0]!.choose();
    expect(inspect).toHaveBeenCalledExactlyOnceWith(reference.requestId);
    expect(save).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Native journal recorded completed"),
      }),
    );
    expect(notify.mock.calls[0]![0].message).toContain(
      "Current files may have changed",
    );
    expect(notify.mock.calls[0]![0].message).toContain("No update was retried");
    const choices = menus[1]!.choices;
    expect(choices.map((choice) => choice.label)).toEqual([
      "Open current task: Task.md",
      "Open current daily note: daily/2026-10-26.md",
      "Forget this inspected reference (does not change files or retry)",
    ]);
    await choices[0]!.choose();
    expect(openFile).toHaveBeenCalledExactlyOnceWith({ path: "Task.md" });
    await choices[2]!.choose();
    expect(save).toHaveBeenCalledExactlyOnceWith([]);
    expect(inspect).toHaveBeenCalledTimes(1);
  });

  it("does not treat a missing journal record as proof that replay is safe", async () => {
    menus.length = 0;
    const notify = vi.fn();
    openNativeTaskRecovery(
      {
        notifications: { notify },
        workspace: {
          getCommandHostDocument: () => ({ defaultView: { innerWidth: 800 } }),
        },
      } as unknown as App,
      { inspect: vi.fn(async () => null) },
      () => [
        {
          requestId: "d5ab7890-0000-4000-8000-000000000001",
          path: "Task.md",
          action: "skip",
          at: "now",
        },
      ],
      vi.fn(),
    );
    await menus[0]!.choices[0]!.choose();
    expect(notify.mock.calls[0]![0].message).toContain(
      "This does not authorize replay",
    );
  });
});
