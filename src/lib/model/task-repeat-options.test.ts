import { describe, expect, it } from "vitest";

import {
  buildTaskRepeatPresentation,
  taskRepeatForPreset,
  taskRepeatPresetFor,
} from "./task-repeat-options";

const NOW = new Date("2026-08-21T10:00:00");

describe("task recurrence preset presentation", () => {
  it("derives weekly, monthly, and yearly labels from the planned date", () => {
    expect(buildTaskRepeatPresentation("2026-08-21", NOW)).toEqual({
      referenceDate: "2026-08-21",
      referenceDateLabel: "Today",
      options: [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly", context: "on Friday" },
        {
          value: "biweekly",
          label: "Every 2 weeks",
          context: "on Friday",
        },
        { value: "monthly", label: "Monthly", context: "on the 21st" },
        { value: "yearly", label: "Yearly", context: "on Aug 21" },
      ],
    });
  });

  it("uses local today for shortcuts without presenting it as an existing plan", () => {
    expect(buildTaskRepeatPresentation(undefined, NOW)).toMatchObject({
      referenceDate: "2026-08-21",
      referenceDateLabel: "No planned date",
    });
  });

  it("recognizes the date-aware two-week shortcut and keeps richer repeats custom", () => {
    expect(
      taskRepeatPresetFor({
        start: "2026-08-21",
        rrule: "FREQ=WEEKLY;INTERVAL=2",
        anchor: "schedule",
        missed: "carry",
      }),
    ).toBe("biweekly");
    expect(
      taskRepeatPresetFor({
        start: "2026-08-21",
        rrule: "FREQ=WEEKLY",
        anchor: "completion",
        missed: "carry",
      }),
    ).toBe("custom");
  });

  it("preserves rolling completion metadata when changing a preset", () => {
    expect(
      taskRepeatForPreset("monthly", {
        start: "2026-08-21",
        rrule: "FREQ=DAILY;INTERVAL=3",
        anchor: "completion",
        missed: "carry",
        lastCompletedAt: "2026-08-18T09:15:00.000Z",
        completionCount: 4,
      }),
    ).toEqual({
      start: "2026-08-21",
      rrule: "FREQ=MONTHLY",
      anchor: "schedule",
      missed: "carry",
      lastCompletedAt: "2026-08-18T09:15:00.000Z",
      completionCount: 4,
    });
  });
});
