import { Menu, type App } from "@lapis-notes/api";
import type { NativeTaskOperation } from "@lapis-notes/api/native-tasks";
import type { NativeTaskAdapter } from "./model/native-task-adapter";
import type { NativeTaskRequestReference } from "./model/native-task-recovery";

type Choice = { label: string; choose(): Promise<void> };

function showRecoveryMenu(app: App, title: string, choices: Choice[]): void {
  const menu = new Menu().popover().setTitle(title);
  for (const choice of choices)
    menu.addItem((item) =>
      item
        .setTitle(choice.label)
        .setIcon("file-search")
        .onClick(() =>
          choice.choose().catch((error) =>
            app.notifications.notify({
              title: "Task inspection failed",
              message: error instanceof Error ? error.message : String(error),
              severity: "error",
              source: "tasks",
              persist: true,
            }),
          ),
        ),
    );
  const doc = app.workspace.getCommandHostDocument();
  menu.showAtPosition(
    { x: (doc.defaultView?.innerWidth ?? 800) / 2, y: 80 },
    doc,
  );
}

export function taskInspectionMessage(
  reference: NativeTaskRequestReference,
  operation: NativeTaskOperation | null,
): string {
  const result = operation
    ? `Native journal recorded ${operation.disposition}.${operation.last_failure ? ` ${operation.last_failure.message}` : ""}`
    : "No operation is recorded for this request. This does not authorize replay.";
  return `${reference.path}: ${result} Current files may have changed since this result. Request ${reference.requestId}. No update was retried.`;
}

export function openNativeTaskRecovery(
  app: App,
  adapter: Pick<NativeTaskAdapter, "inspect">,
  references: () => NativeTaskRequestReference[],
  save: (references: NativeTaskRequestReference[]) => Promise<void>,
): void {
  if (!references().length) {
    app.notifications.notify({
      title: "Task update inspection",
      message: "No interrupted task updates are retained.",
      source: "tasks",
    });
    return;
  }
  const openCurrent = async (path: string) => {
    const file = app.vault.getFileByPath(path);
    if (!file) throw new Error(`Current file is missing: ${path}`);
    await app.workspace.getLeaf("tab").openFile(file);
  };
  showRecoveryMenu(
    app,
    "Inspect interrupted task update",
    references().map((reference) => ({
      label: `${reference.path} · ${reference.action} · ${reference.at} · ${reference.requestId}`,
      choose: async () => {
        const operation = await adapter.inspect(reference.requestId);
        app.notifications.notify({
          title: "Task update inspection",
          message: taskInspectionMessage(reference, operation),
          severity: "info",
          source: "tasks",
          persist: true,
        });
        const choices: Choice[] = [
          {
            label: `Open current task: ${reference.path}`,
            choose: () => openCurrent(reference.path),
          },
        ];
        if (operation?.daily)
          choices.push({
            label: `Open current daily note: ${operation.daily.path}`,
            choose: () => openCurrent(operation.daily!.path),
          });
        choices.push({
          label:
            "Forget this inspected reference (does not change files or retry)",
          choose: () =>
            save(
              references().filter(
                (entry) => entry.requestId !== reference.requestId,
              ),
            ),
        });
        showRecoveryMenu(app, "Inspected task update", choices);
      },
    })),
  );
}
