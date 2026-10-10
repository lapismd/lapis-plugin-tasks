import type { App } from "@lapis-notes/api";
import { parseDocument } from "yaml";
import { isLocalDateString } from "./recurrence-engine";

export type TaskAgendaStore = {
  locate(date: string): Promise<{ path: string } | null>;
  ensure(date: string): Promise<{ path: string }>;
  read(path: string): Promise<string>;
  process(path: string, mutate: (raw: string) => string): Promise<string>;
};

function frontMatter(raw: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  if (!match)
    throw new Error(
      "Daily agenda order requires canonical daily-note front matter.",
    );
  const document = parseDocument(match[1]);
  if (document.errors.length)
    throw new Error(
      "Daily note YAML must be repaired before changing its agenda order.",
    );
  return { match, document };
}

export function readAgendaOrder(raw: string): string[] {
  const { document } = frontMatter(raw);
  const value = document.getIn(["tasks", "agendaOrder"]);
  const entries =
    value && typeof value === "object" && "toJSON" in value
      ? (value as { toJSON(): unknown }).toJSON()
      : value;
  return Array.isArray(entries)
    ? [...new Set(entries.filter((id): id is string => typeof id === "string"))]
    : [];
}

export function mergeAgendaOrder(
  previous: readonly string[],
  reordered: readonly string[],
): string[] {
  const next = [...new Set(reordered)];
  const moving = new Set(next);
  let index = 0;
  const merged = previous.map((id) => (moving.has(id) ? next[index++] : id));
  return [...new Set([...merged, ...next.slice(index)])];
}

export class TaskAgendaRepository {
  constructor(private readonly store: TaskAgendaStore) {}

  async order(date: string): Promise<string[]> {
    if (!isLocalDateString(date))
      throw new Error("Agenda date must be a valid local date.");
    const file = await this.store.locate(date);
    return file ? readAgendaOrder(await this.store.read(file.path)) : [];
  }

  async reorder(date: string, taskIds: readonly string[]): Promise<string[]> {
    if (!isLocalDateString(date))
      throw new Error("Agenda date must be a valid local date.");
    const file = await this.store.ensure(date);
    const result = await this.store.process(file.path, (raw) => {
      const { match, document } = frontMatter(raw);
      if (
        document.get("type") !== "daily-note" ||
        String(document.get("date")) !== date
      )
        throw new Error("Daily provider returned a different date.");
      document.setIn(
        ["tasks", "agendaOrder"],
        mergeAgendaOrder(readAgendaOrder(raw), taskIds),
      );
      const newline = raw.includes("\r\n") ? "\r\n" : "\n";
      return `---${newline}${document.toString().trimEnd().replace(/\n/g, newline)}${newline}---${newline}${raw.slice(match[0].length)}`;
    });
    return readAgendaOrder(result);
  }
}

export function createAppTaskAgendaRepository(app: App): TaskAgendaRepository {
  return new TaskAgendaRepository({
    locate: (date) => app.dailyDocumentProviders.resolve().locate(date),
    ensure: (date) => app.dailyDocumentProviders.resolve().ensure(date),
    read: async (path) => {
      const file = app.vault.getFileByPath(path);
      if (!file)
        throw new Error("Daily note disappeared before reading agenda order.");
      return app.vault.read(file);
    },
    process: async (path, mutate) => {
      const file = app.vault.getFileByPath(path);
      if (!file)
        throw new Error("Daily note disappeared before saving agenda order.");
      return app.vault.process(file, mutate);
    },
  });
}
