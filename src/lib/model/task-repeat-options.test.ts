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
        strategy: "rolling",
        frequency: "weekly",
        interval: 2,
        anchor: "schedule",
      }),
    ).toBe("biweekly");
    expect(
      taskRepeatPresetFor({
        strategy: "rolling",
        frequency: "weekly",
        interval: 1,
        anchor: "completion",
      }),
    ).toBe("custom");
  });

  it("preserves rolling completion metadata when changing a preset", () => {
    expect(
      taskRepeatForPreset("monthly", {
        strategy: "rolling",
        frequency: "daily",
        interval: 3,
        anchor: "completion",
        lastCompletedAt: "2026-08-18T09:15:00.000Z",
        completionCount: 4,
      }),
    ).toEqual({
      strategy: "rolling",
      frequency: "monthly",
      interval: 1,
      anchor: "schedule",
      lastCompletedAt: "2026-08-18T09:15:00.000Z",
      completionCount: 4,
    });
  });
});
