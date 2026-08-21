import { describe, expect, it } from "vitest";
import { MemoryAppDatabase } from "@lapis-notes/api/app-database";
import { parseTaskDocument, type TaskDocument } from "./task-document";
import {
  TaskOccurrenceRepository,
  taskOccurrenceDayPart,
  type DailyDocumentMutationStore,
} from "./task-occurrence-repository";

function task(source: string): TaskDocument {
  return parseTaskDocument(source, "tasks/hydrate.md") as TaskDocument;
}

function fixture(): {
  documents: Map<string, string>;
  store: DailyDocumentMutationStore;
} {
  const documents = new Map<string, string>();
  return {
    documents,
    store: {
      async ensure(date) {
        const path = `daily/${date}.md`;
        if (!documents.has(path)) {
          documents.set(path, `---\ntype: daily-note\ndate: ${date}\n---\n`);
        }
        return { path };
      },
      async process(path, mutate) {
        const next = mutate(documents.get(path)!);
        documents.set(path, next);
        return next;
      },
    },
  };
}

const source = `---
type: task
id: hydrate
task:
  status: open
  inbox: false
  start:
    kind: anytime
  plan:
    date: 2026-08-21
    at: time
    time: 13:30
  repeat:
    start: 2026-08-21
    rrule: FREQ=DAILY
    anchor: schedule
    missed: carry
  tracking:
    type: count
    unit: glasses
  comments: []
---

# Hydrate
`;

describe("TaskOccurrenceRepository", () => {
  it("classifies exact times using configured day-part boundaries", () => {
    expect(
      taskOccurrenceDayPart(
        { date: "2026-08-21", at: "time", time: "13:00" },
        { afternoonStartsAt: "12:00", eveningStartsAt: "17:00" },
      ),
    ).toBe("afternoon");
    expect(
      taskOccurrenceDayPart(
        { date: "2026-08-21", at: "time", time: "17:00" },
        { afternoonStartsAt: "12:00", eveningStartsAt: "17:00" },
      ),
    ).toBe("evening");
  });

  it("atomically materializes and completes an idempotent quantitative observation", async () => {
    const { documents, store } = fixture();
    const repository = new TaskOccurrenceRepository(
      new MemoryAppDatabase(),
      store,
      () => ({ afternoonStartsAt: "12:00", eveningStartsAt: "17:00" }),
    );
    const document = task(source);
    const first = await repository.complete(document, "2026-08-21", {
      type: "count",
      value: 8,
      unit: "glasses",
    });
    const retry = await repository.complete(document, "2026-08-21", {
      type: "count",
      value: 8,
      unit: "glasses",
    });
    expect(retry).toMatchObject({ outcome: "completed", value: 8, unit: "glasses" });
    expect(first.sourceStart).toBe(retry.sourceStart);
    expect(documents.get("daily/2026-08-21.md")?.match(/task-occurrence/g)).toHaveLength(1);
  });
});
