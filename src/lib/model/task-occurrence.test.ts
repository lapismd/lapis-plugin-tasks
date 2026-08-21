import { describe, expect, it } from "vitest";
import {
  DuplicateTaskOccurrenceError,
  StaleTaskOccurrenceRangeError,
  completeTaskOccurrence,
  createTaskOccurrencesProjectionRegistration,
  materializeTaskOccurrence,
  scanTaskOccurrenceObservations,
  taskOccurrenceProjectionRows,
  trackingCompletion,
} from "./task-occurrence";

const daily = `---
type: daily-note
date: 2026-08-21
---

# Friday
`;

describe("daily task occurrence Markdown", () => {
  it("materializes one readable observation under the selected day part", () => {
    const once = materializeTaskOccurrence(daily, "daily/2026-08-21.md", {
      taskId: "task-water",
      taskPath: "tasks/drink-water.md",
      title: "Drink water",
      occurrenceDate: "2026-08-21",
      tracking: { type: "count", unit: "glasses", target: 8 },
      dayPart: "morning",
    });
    const twice = materializeTaskOccurrence(once, "daily/2026-08-21.md", {
      taskId: "task-water",
      taskPath: "tasks/drink-water.md",
      title: "Drink water",
      occurrenceDate: "2026-08-21",
      tracking: { type: "count", unit: "glasses", target: 8 },
      dayPart: "morning",
    });

    expect(twice).toBe(once);
    expect(once).toContain("## Tasks\n\n### Morning");
    expect(once).toContain(
      "- [ ] [Drink water](../tasks/drink-water.md) <!-- task-occurrence task=task-water date=2026-08-21 kind=count unit=glasses -->",
    );
  });

  it("adds a missing day part without replacing existing daily content", () => {
    const raw = `${daily}\n## Tasks\n\n### Anytime\n\nA note about today.\n\n## Journal\n\nKept.\n`;
    const next = materializeTaskOccurrence(raw, "daily/2026-08-21.md", {
      taskId: "task-walk",
      taskPath: "tasks/walk.md",
      title: "Walk",
      occurrenceDate: "2026-08-21",
      dayPart: "evening",
    });
    expect(next).toContain("A note about today.\n\n### Evening");
    expect(next).toContain("## Journal\n\nKept.");
  });

  it("parses exact source ranges and preserves indented context during completion", () => {
    const pending = materializeTaskOccurrence(daily, "daily/2026-08-21.md", {
      taskId: "task-water",
      taskPath: "tasks/drink-water.md",
      title: "Drink water",
      occurrenceDate: "2026-08-21",
      tracking: { type: "count", unit: "glasses" },
      dayPart: "morning",
    }).replace(" unit=glasses -->", " unit=glasses -->\n  Felt easier after breakfast.");
    const [observation] = scanTaskOccurrenceObservations(
      pending,
      "daily/2026-08-21.md",
    );
    expect(observation).toMatchObject({
      taskId: "task-water",
      taskPath: "tasks/drink-water.md",
      occurrenceDate: "2026-08-21",
      trackingKind: "count",
      unit: "glasses",
      dayPart: "morning",
      checked: false,
      outcome: "pending",
    });
    expect(observation!.source).toContain("Felt easier after breakfast.");

    const completed = completeTaskOccurrence(
      pending,
      "daily/2026-08-21.md",
      observation!,
      { type: "count", value: 7, unit: "glasses" },
    );
    expect(completed).toContain("- [x] [Drink water](../tasks/drink-water.md) : 7 glasses");
    expect(completed).toContain("  Felt easier after breakfast.");
    expect(scanTaskOccurrenceObservations(completed, "daily/2026-08-21.md")[0]).toMatchObject({
      checked: true,
      outcome: "completed",
      value: 7,
      unit: "glasses",
    });
  });

  it("writes duration values and rejects stale source ranges", () => {
    const pending = materializeTaskOccurrence(daily, "daily/2026-08-21.md", {
      taskId: "task-read",
      taskPath: "tasks/read.md",
      title: "Read",
      occurrenceDate: "2026-08-21",
      tracking: { type: "duration", target: "30m" },
      dayPart: "anytime",
    });
    const observation = scanTaskOccurrenceObservations(pending, "daily/2026-08-21.md")[0]!;
    const completed = completeTaskOccurrence(
      pending,
      "daily/2026-08-21.md",
      observation,
      { type: "duration", durationMinutes: 45 },
    );
    expect(completed).toContain(" : 45m <!-- task-occurrence");
    expect(() =>
      completeTaskOccurrence(
        completed,
        "daily/2026-08-21.md",
        observation,
        { type: "duration", durationMinutes: 45 },
      ),
    ).toThrow(StaleTaskOccurrenceRangeError);
  });

  it("fails visibly for duplicate identities", () => {
    const once = materializeTaskOccurrence(daily, "daily/2026-08-21.md", {
      taskId: "task-walk",
      taskPath: "tasks/walk.md",
      title: "Walk",
      occurrenceDate: "2026-08-21",
      dayPart: "anytime",
    });
    const line = once.split("\n").find((value) => value.includes("task-occurrence"))!;
    const duplicate = `${once}${line}\n`;
    expect(() =>
      materializeTaskOccurrence(duplicate, "daily/2026-08-21.md", {
        taskId: "task-walk",
        taskPath: "tasks/walk.md",
        title: "Walk",
        occurrenceDate: "2026-08-21",
        dayPart: "anytime",
      }),
    ).toThrow(DuplicateTaskOccurrenceError);
  });

  it("projects disposable public observation rows from daily Markdown", async () => {
    const raw = materializeTaskOccurrence(daily, "daily/2026-08-21.md", {
      taskId: "task-walk",
      taskPath: "tasks/walk.md",
      title: "Walk",
      occurrenceDate: "2026-08-21",
      dayPart: "afternoon",
    });
    expect(taskOccurrenceProjectionRows(raw, "daily/2026-08-21.md")).toEqual([
      expect.objectContaining({
        observationId: "task-walk:2026-08-21",
        taskPath: "tasks/walk.md",
        dailyDocumentPath: "daily/2026-08-21.md",
        outcome: "pending",
        trackingKind: "boolean",
        sourceStart: expect.any(Number),
        sourceEnd: expect.any(Number),
        projectionVersion: 1,
      }),
    ]);
    const registration = createTaskOccurrencesProjectionRegistration();
    const projected = await registration.project({
      file: {
        path: "daily/2026-08-21.md",
        extension: "md",
        basename: "2026-08-21",
        mtime: 1,
        size: raw.length,
      },
      content: raw,
      cache: undefined,
    });
    expect(projected.rows).toHaveLength(1);
    expect(projected.rows[0]).toMatchObject({ id: "task-walk:2026-08-21", kind: "observation" });
  });

  it("requires values only for quantitative tracking", () => {
    expect(trackingCompletion({ type: "boolean" })).toEqual({ type: "boolean" });
    expect(trackingCompletion({ type: "number", unit: "kg" }, 12.5)).toEqual({
      type: "number",
      value: 12.5,
      unit: "kg",
    });
    expect(() => trackingCompletion({ type: "count", unit: "pages" })).toThrow(
      "requires a value",
    );
  });
});
