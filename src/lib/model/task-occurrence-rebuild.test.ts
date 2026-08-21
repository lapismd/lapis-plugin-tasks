import {
  MemoryAppDatabase,
  PUBLIC_TASK_OCCURRENCES_PROJECTION_ID,
  TASK_OCCURRENCE_PROJECTION_FIELDS,
  TASK_OCCURRENCE_PROJECTION_VERSION,
} from "@lapis-notes/api/app-database";
import { describe, expect, it } from "vitest";
import { parseTaskDocument } from "./task-document";
import { indexTaskDocument } from "./task-index";
import { taskOccurrenceProjectionRows } from "./task-occurrence";
import { TaskRepository } from "./task-repository";

const taskRaw = `---
type: task
id: read
task:
  status: open
  inbox: false
  start: anytime
  plan:
    date: 2026-08-21
    at: anytime
  repeat:
    start: 2026-08-20
    rrule: FREQ=DAILY
    anchor: schedule
    missed: carry
  tracking:
    type: duration
  comments: []
---
# Read
`;

const dailyRaw = `---
type: daily-note
date: 2026-08-20
---

## Tasks

### Anytime

- [x] [Read](../tasks/read.md) : 45m <!-- task-occurrence task=read date=2026-08-20 kind=duration -->
`;

async function rebuiltHistory() {
  const database = new MemoryAppDatabase();
  await database.open();
  const task = parseTaskDocument(taskRaw, "tasks/read.md")!;
  await indexTaskDocument(database, task, undefined, "2026-08-21");
  await database.registerProjectionDefinition({
    projectionId: PUBLIC_TASK_OCCURRENCES_PROJECTION_ID,
    ownerPluginId: "tasks",
    schemaVersion: TASK_OCCURRENCE_PROJECTION_VERSION,
    configHash: "occurrence-v1",
    visibility: "public",
    fields: TASK_OCCURRENCE_PROJECTION_FIELDS,
    active: true,
    updatedAt: 1,
  });
  const rows = taskOccurrenceProjectionRows(dailyRaw, "daily/2026-08-20.md");
  await database.replaceProjectionSource({
    projectionId: PUBLIC_TASK_OCCURRENCES_PROJECTION_ID,
    sourcePath: "daily/2026-08-20.md",
    sourceHash: "daily-source",
    rows: rows.map((row, ordinal) => ({
      id: row.observationId,
      kind: "observation",
      ordinal,
      data: row as unknown as Record<string, unknown>,
    })),
    writerPluginId: "tasks",
  });
  return new TaskRepository(database).occurrenceHistory(
    "2026-08-20",
    "2026-08-20",
    "2026-08-21",
  );
}

describe("occurrence projection rebuild", () => {
  it("recreates the same historical API after complete database deletion", async () => {
    const beforeDeletion = await rebuiltHistory();
    const afterDeletion = await rebuiltHistory();
    expect(afterDeletion).toEqual(beforeDeletion);
    expect(afterDeletion).toMatchObject([
      {
        taskId: "read",
        occurrenceDate: "2026-08-20",
        outcome: "completed",
        durationMinutes: 45,
        expected: true,
      },
    ]);
  });
});
