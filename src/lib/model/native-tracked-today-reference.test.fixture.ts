import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import { vi } from "vitest";
import { TasksPlugin } from "../tasks-plugin";
import { parseTaskDocument } from "./task-document";
import {
  createTaskStructureResolverFromDocuments,
  indexTaskDocument,
} from "./task-index";
import { createMemoryTaskFileStore, TaskRepository } from "./task-repository";
import { TaskOccurrenceRepository } from "./task-occurrence-repository";
import { scanTaskOccurrenceObservations } from "./task-occurrence";
import type { TrackedTodayInput } from "./native-tracked-today-inputs.test.fixture";

// The captured method uses neither plugin inheritance nor UI registration.
// Keep those host-only imports inert while retaining the real method body.
vi.mock("@lapis-notes/api", () => ({ Plugin: class {} }));
vi.mock("../tasks-settings-tab", () => ({ TasksSettingsTab: class {} }));
vi.mock("../register-tasks-settings", () => ({
  registerTasksWorkspaceSettings() {},
}));
vi.mock("../tasks-view", () => ({
  TASKS_VIEW_TYPE: "tasks",
  TasksView: class {},
}));
vi.mock("../task-list-markdown-extension", () => ({
  createTaskStructureMarkdownContribution() {},
}));

const json = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const settings = { afternoonStartsAt: "12:00", eveningStartsAt: "18:00" };

/** Invoke the unchanged plugin method with its actual repositories and injected IO. */
export async function captureTrackedToday(
  input: TrackedTodayInput,
): Promise<unknown> {
  const database = new MemoryAppDatabase(`native-tracked:${input.name}`);
  await database.open();
  const files = createMemoryTaskFileStore(input.files);
  const documents = Object.entries(input.files).map(([path, raw]) => {
    const document = parseTaskDocument(raw, path);
    if (!document) throw new Error(`Invalid reference input: ${path}`);
    return document;
  });
  const resolve = createTaskStructureResolverFromDocuments(documents);
  for (const document of documents) {
    await indexTaskDocument(database, document, resolve, input.dates[0]!);
  }
  const daily = new Map(Object.entries(input.daily));
  let date = input.dates[0]!;
  let intents: unknown[] = [];
  const occurrences = new TaskOccurrenceRepository(
    database,
    {
      async ensure(day) {
        const existing = [...daily].find(([, raw]) =>
          raw.includes(`date: ${day}\n`),
        );
        const path = existing?.[0] ?? `daily/${day}.md`;
        intents.push({ kind: "ensure-daily", date: day, path });
        if (!daily.has(path)) {
          const raw = `---\ntype: daily-note\ndate: ${day}\n---\n\n# ${day}\n`;
          daily.set(path, raw);
          intents.push({ kind: "create-daily", path, raw });
        }
        return { path };
      },
      async process(path, mutate) {
        const raw = mutate(daily.get(path)!);
        intents.push({ kind: "daily-write", path, raw });
        daily.set(path, raw);
        return raw;
      },
    },
    () => settings,
  );
  const repository = new TaskRepository(
    database,
    files,
    () => new Date(`${date}T09:00:00`),
    occurrences,
  );
  const owner = { repository, occurrences };
  const method = (
    TasksPlugin.prototype as unknown as {
      materializeTrackedToday(this: typeof owner, today: string): Promise<void>;
    }
  ).materializeTrackedToday;
  const attempts = [];
  try {
    for (date of input.dates) {
      intents = [];
      await method.call(owner, date);
      attempts.push(
        json({
          date,
          intents,
          daily: Object.fromEntries(daily),
          observations: Object.fromEntries(
            [...daily].map(([path, raw]) => [
              path,
              scanTaskOccurrenceObservations(raw, path),
            ]),
          ),
          tasks: Object.fromEntries(
            await Promise.all(
              Object.keys(input.files).map(async (path) => [
                path,
                await files.read(path),
              ]),
            ),
          ),
        }),
      );
    }
  } finally {
    await database.close();
  }
  return { settings, attempts };
}
