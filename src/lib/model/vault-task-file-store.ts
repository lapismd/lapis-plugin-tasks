import type { App } from "@lapis-notes/api";
import type { TaskFileStore } from "./task-repository";

function parentFolder(path: string): string | null {
  const index = path.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : null;
}

export function createVaultTaskFileStore(app: App): TaskFileStore {
  return {
    async read(path) {
      const file = app.vault.getFileByPath(path);
      if (!file) throw new Error(`Missing task file: ${path}`);
      return app.vault.cachedRead(file);
    },
    async create(path, content) {
      const folder = parentFolder(path);
      if (folder) await app.vault.mkpath(folder);
      await app.vault.create(path, content);
    },
    async process(path, mutate) {
      const file = app.vault.getFileByPath(path);
      if (!file) throw new Error(`Missing task file: ${path}`);
      return app.vault.process(file, mutate);
    },
    async write(path, content) {
      const file = app.vault.getFileByPath(path);
      if (file) {
        await app.vault.modify(file, content);
        return;
      }
      const folder = parentFolder(path);
      if (folder) await app.vault.mkpath(folder);
      await app.vault.create(path, content);
    },
    async remove(path) {
      const file = app.vault.getFileByPath(path);
      if (file) await app.vault.trash(file, false);
    },
  };
}
