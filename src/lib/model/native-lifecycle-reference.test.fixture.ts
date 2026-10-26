import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import { vi } from "vitest";
import { parseTaskDocument, serializeTaskDocument } from "./task-document";
import * as mutations from "./task-mutations";
import * as occurrence from "./task-occurrence";
import { TaskOccurrenceRepository } from "./task-occurrence-repository";
import { TaskRepository } from "./task-repository";
import type { LifecycleInput } from "./native-lifecycle-inputs.test.fixture";

type Json = Record<string, unknown>;
const json = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function retainedError(value: unknown) {
  const error = value as Error & { code?: string; parts?: string[] };
  return { name: error.name, message: error.message,
    ...(error.code === undefined ? {} : { code: error.code }),
    ...(error.parts === undefined ? {} : { parts: error.parts }) };
}

/** Transparent observation of the actual repositories, never a substitute engine. */
export async function captureLifecycle(input: LifecycleInput): Promise<unknown> {
  const database = new MemoryAppDatabase(`native-lifecycle:${input.name}`);
  await database.open();
  const tasks = new Map([[input.path, input.raw]]);
  const daily = new Map(Object.entries(input.daily));
  let taskFailures = input.failTaskWrites ?? 0;
  let dailyFailures = input.failDailyWrites ?? 0;
  let intents: Json[] = [];
  let plan: Json = {};
  let completionIntent: unknown;
  let currentDate = input.actions[0]!.localDate;
  const complete = mutations.completeTaskDocument;
  const skip = mutations.skipOccurrence;
  const materialize = occurrence.materializeTaskOccurrence;
  const finish = occurrence.completeTaskOccurrence;
  const tracking = occurrence.trackingCompletion;
  const spies = [
    vi.spyOn(occurrence, "trackingCompletion").mockImplementation((...args) => {
      const value = tracking(...args);
      completionIntent = json(value);
      return value;
    }),
    vi.spyOn(mutations, "completeTaskDocument").mockImplementation((...args) => {
      const next = complete(...args);
      plan.taskRaw = serializeTaskDocument(next);
      return next;
    }),
    vi.spyOn(mutations, "skipOccurrence").mockImplementation((...args) => {
      const next = skip(...args);
      plan.taskRaw = serializeTaskDocument(next);
      return next;
    }),
    vi.spyOn(occurrence, "materializeTaskOccurrence").mockImplementation((...args) => {
      plan.observation = { input: json(args[2]),
        ...(completionIntent === undefined ? {} : { completion: completionIntent }) };
      return materialize(...args);
    }),
    vi.spyOn(occurrence, "completeTaskOccurrence").mockImplementation((...args) => {
      (plan.observation as Json).completion = json(args[3]);
      return finish(...args);
    }),
  ];
  const occurrences = new TaskOccurrenceRepository(database, {
    async ensure(date) {
      const path = input.dailyPath ?? `daily/${date}.md`;
      intents.push({ kind: "ensure-daily", date, path });
      if (!daily.has(path)) {
        const raw = `---\ntype: daily-note\ndate: ${date}\n---\n\n# ${date}\n`;
        daily.set(path, raw);
        intents.push({ kind: "create-daily", path, raw });
      }
      return { path };
    },
    async process(path, mutate) {
      const raw = mutate(daily.get(path)!);
      const failed = dailyFailures-- > 0;
      intents.push({ kind: "daily-write", path, raw, failed });
      if (failed) throw new Error("simulated daily write failure");
      daily.set(path, raw);
      return raw;
    },
  }, () => input.settings);
  const repository = new TaskRepository(database, {
    async read(path) { return tasks.get(path)!; },
    async write(path, raw) {
      const failed = taskFailures-- > 0;
      intents.push({ kind: "task-write", path, raw, failed });
      if (failed) throw new Error("simulated Task write failure");
      tasks.set(path, raw);
    },
    async process(path, mutate) {
      const raw = mutate(tasks.get(path)!);
      const failed = taskFailures-- > 0;
      intents.push({ kind: "task-write", path, raw, failed });
      if (failed) throw new Error("simulated Task write failure");
      tasks.set(path, raw);
      return raw;
    },
  }, () => new Date(`${currentDate}T09:00:00`), occurrences);
  const attempts = [];
  try {
    for (const action of input.actions) {
      currentDate = action.localDate;
      intents = [];
      plan = {};
      completionIntent = undefined;
      let result: unknown;
      try {
        const value = action.type === "complete"
          ? await repository.complete(input.path, action.at, action.trackedValue)
          : await repository.skip(input.path, action.at);
        result = { value: json(value) };
      } catch (error) { result = { error: retainedError(error) }; }
      const planner = (result as { error?: unknown }).error && intents.length === 0
        ? { error: (result as { error: unknown }).error } : { value: plan };
      const taskRaw = tasks.get(input.path)!;
      attempts.push(json({ result, planner, plan, intents, taskRaw,
        task: parseTaskDocument(taskRaw, input.path), daily: Object.fromEntries(daily),
        observations: Object.fromEntries([...daily].map(([path, raw]) =>
          [path, occurrence.scanTaskOccurrenceObservations(raw, path)])),
      }));
    }
  } finally {
    spies.forEach((spy) => spy.mockRestore());
    await database.close();
  }
  return { attempts };
}
