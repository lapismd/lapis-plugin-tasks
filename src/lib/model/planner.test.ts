import { describe, expect, it } from "vitest";
import { resolveTaskPlannerPlacement } from "./planner";

describe("resolveTaskPlannerPlacement", () => {
  const now = new Date("2026-08-20T12:00:00");

  it("writes anytime for Today and day-parts for morning and afternoon", () => {
    expect(resolveTaskPlannerPlacement("today", now)).toMatchObject({
      planDate: "2026-08-20",
      planAt: "anytime",
      when: null,
    });
    expect(resolveTaskPlannerPlacement("this-morning", now)).toMatchObject({
      planDate: "2026-08-20",
      planAt: "morning",
      when: null,
    });
    expect(resolveTaskPlannerPlacement("this-afternoon", now)).toMatchObject({
      planDate: "2026-08-20",
      planAt: "afternoon",
      when: null,
    });
    expect(resolveTaskPlannerPlacement("this-evening", now)).toMatchObject({
      planDate: "2026-08-20",
      planAt: "evening",
      when: "this-evening",
    });
  });
});
