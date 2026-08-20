import { describe, expect, it } from "vitest";
import { createTask } from "./fixtures";
import {
  classifyTask,
  resolveTaskPlanAt,
  resolveTaskPlannerPlacement,
} from "./planner";
import { formatTaskScheduleLabel } from "./task-dates";

describe("resolveTaskPlannerPlacement", () => {
  const now = new Date("2026-08-20T12:00:00");

  it("writes Today and Tomorrow dates and keeps an existing day-part", () => {
    expect(resolveTaskPlannerPlacement("today", now)).toMatchObject({
      planDate: "2026-08-20",
      planAt: "anytime",
      when: null,
    });
    expect(resolveTaskPlannerPlacement("tomorrow", now)).toMatchObject({
      planDate: "2026-08-21",
      planAt: "anytime",
      when: null,
    });
    expect(
      resolveTaskPlannerPlacement("today", now, { planAt: "morning" }),
    ).toMatchObject({
      planDate: "2026-08-20",
      planAt: "morning",
      when: null,
    });
    expect(
      resolveTaskPlannerPlacement("tomorrow", now, { planAt: "evening" }),
    ).toMatchObject({
      planDate: "2026-08-21",
      planAt: "evening",
      when: "this-evening",
    });
    expect(resolveTaskPlannerPlacement("this-evening", now)).toMatchObject({
      planDate: "2026-08-20",
      planAt: "evening",
      when: "this-evening",
    });
  });
});

describe("resolveTaskPlanAt", () => {
  const now = new Date("2026-08-20T12:00:00");

  it("keeps the existing date and writes day-parts", () => {
    expect(
      resolveTaskPlanAt(
        "morning",
        { planDate: "2026-08-22", scheduledAt: "2026-08-22", when: null },
        now,
      ),
    ).toMatchObject({
      planDate: "2026-08-22",
      planAt: "morning",
      when: null,
    });
    expect(
      resolveTaskPlanAt(
        "evening",
        { planDate: "2026-08-22", scheduledAt: "2026-08-22" },
        now,
      ),
    ).toMatchObject({
      planDate: "2026-08-22",
      planAt: "evening",
      when: "this-evening",
    });
  });

  it("plans today when a day-part is chosen without a date", () => {
    expect(resolveTaskPlanAt("afternoon", { when: "anytime" }, now)).toMatchObject({
      planDate: "2026-08-20",
      planAt: "afternoon",
      when: null,
    });
  });

  it("clears this-evening when anytime is chosen on a dated task", () => {
    expect(
      resolveTaskPlanAt(
        "anytime",
        {
          planDate: "2026-08-20",
          scheduledAt: "2026-08-20",
          when: "this-evening",
        },
        now,
      ),
    ).toMatchObject({
      planDate: "2026-08-20",
      planAt: "anytime",
      when: null,
    });
  });
});
