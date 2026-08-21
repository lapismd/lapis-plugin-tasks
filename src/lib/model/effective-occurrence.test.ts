import { describe, expect, it } from "vitest";
import type { TaskRepeat } from "./task-document";
import {
  nextRecurrenceDate,
  resolveEffectiveOccurrence,
} from "./effective-occurrence";

function repeat(patch: Partial<TaskRepeat> = {}): TaskRepeat {
  return {
    start: "2026-08-17",
    rrule: "FREQ=DAILY",
    anchor: "schedule",
    missed: "carry",
    ...patch,
  };
}

describe("resolveEffectiveOccurrence", () => {
  it("retains carry backlog and resolves skip after several offline days without writes", () => {
    expect(
      resolveEffectiveOccurrence(repeat(), "2026-08-17", "2026-08-21"),
    ).toMatchObject({ date: "2026-08-17", state: "overdue" });
    expect(
      resolveEffectiveOccurrence(
        repeat({ missed: "skip" }),
        "2026-08-17",
        "2026-08-21",
      ),
    ).toMatchObject({ date: "2026-08-21", state: "current" });
  });

  it("returns future and exhausted states from library occurrences", () => {
    expect(
      resolveEffectiveOccurrence(
        repeat({ rrule: "FREQ=WEEKLY;BYDAY=MO" }),
        "2026-08-24",
        "2026-08-21",
      ),
    ).toMatchObject({ date: "2026-08-24", state: "future" });
    expect(
      resolveEffectiveOccurrence(
        repeat({ rrule: "FREQ=DAILY;COUNT=2", completionCount: 2 }),
        undefined,
        "2026-08-21",
      ),
    ).toMatchObject({ state: "exhausted" });
  });

  it("keeps completion-anchor carry and permits an origin on first completion", () => {
    expect(
      resolveEffectiveOccurrence(
        repeat({ anchor: "completion", start: undefined }),
        "2026-08-19",
        "2026-08-21",
      ),
    ).toMatchObject({ date: "2026-08-19", state: "overdue" });
  });

  it("reports paused and unsupported rules without automatic advancement", () => {
    expect(
      resolveEffectiveOccurrence(
        repeat({ paused: true, pausedSince: "2026-08-20" }),
        "2026-08-19",
        "2026-08-21",
      ),
    ).toMatchObject({ date: "2026-08-19", state: "paused" });
    expect(
      resolveEffectiveOccurrence(
        repeat({ rrule: "FREQ=HOURLY" }),
        "2026-08-21",
        "2026-08-21",
      ),
    ).toMatchObject({ date: "2026-08-21", state: "unsupported" });
  });

  it("excludes persisted inclusive pause ranges", () => {
    const pausedRange = repeat({
      pauseRanges: [{ start: "2026-08-18", end: "2026-08-20" }],
    });
    expect(nextRecurrenceDate(pausedRange, "2026-08-18", true)).toBe(
      "2026-08-21",
    );
  });
});
