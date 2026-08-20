import { describe, expect, it } from "vitest";
import { createTask } from "./fixtures";
import {
  buildTaskPlannerDaySectionPatch,
  buildTaskPlannerDaySnapshot,
  buildTaskPlannerWeek,
  classifyTask,
  isTaskOverdueForDay,
  resolveTaskDaySection,
  resolveTaskPlanAt,
  resolveTaskPlannerPlacement,
} from "./planner";
import { formatTaskScheduleLabel } from "./task-dates";
import type { Task } from "./types";

function agendaTask(patch: Partial<Task> = {}) {
  return createTask({ title: patch.id ?? "Agenda task", ...patch });
}

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

describe("daily agenda", () => {
  const settings = {
    dayParts: {
      afternoonStartsAt: "12:00",
      eveningStartsAt: "17:00",
    },
    dailyAgenda: {
      hideOverdueTasks: false,
    },
  };

  it("routes clock values at the configured boundaries", () => {
    expect(resolveTaskDaySection(agendaTask({ planAt: "11:59" }), settings)).toBe(
      "morning",
    );
    expect(resolveTaskDaySection(agendaTask({ planAt: "12:00" }), settings)).toBe(
      "afternoon",
    );
    expect(resolveTaskDaySection(agendaTask({ planAt: "16:59" }), settings)).toBe(
      "afternoon",
    );
    expect(resolveTaskDaySection(agendaTask({ planAt: "17:00" }), settings)).toBe(
      "evening",
    );
  });

  it("honors explicit day parts and sends absent or invalid times to Anytime", () => {
    expect(resolveTaskDaySection(agendaTask({ planAt: "morning" }), settings)).toBe(
      "morning",
    );
    expect(resolveTaskDaySection(agendaTask({ planAt: "afternoon" }), settings)).toBe(
      "afternoon",
    );
    expect(resolveTaskDaySection(agendaTask({ when: "this-evening" }), settings)).toBe(
      "evening",
    );
    expect(resolveTaskDaySection(agendaTask({ planAt: "25:00" }), settings)).toBe(
      "anytime",
    );
    expect(resolveTaskDaySection(agendaTask(), settings)).toBe("anytime");
  });

  it("includes overdue open tasks, groups Done by completion date, and excludes canceled tasks", () => {
    const selectedDate = "2026-08-20";
    const snapshot = buildTaskPlannerDaySnapshot(
      [
        agendaTask({ id: "planned", planDate: "2026-08-19", planAt: "morning" }),
        agendaTask({ id: "due", deadline: "2026-08-18", planAt: "12:00" }),
        agendaTask({
          id: "done",
          status: "completed",
          completedAt: "2026-08-20T09:00:00.000Z",
        }),
        agendaTask({
          id: "old-done",
          status: "completed",
          completedAt: "2026-08-19T09:00:00.000Z",
        }),
        agendaTask({
          id: "canceled",
          status: "canceled",
          completedAt: "2026-08-20T10:00:00.000Z",
        }),
      ],
      selectedDate,
      settings,
      selectedDate,
    );

    expect(snapshot.morning.map((task) => task.id)).toEqual(["planned"]);
    expect(snapshot.afternoon.map((task) => task.id)).toEqual(["due"]);
    expect(snapshot.done.map((task) => task.id)).toEqual(["done"]);
    expect(Object.values(snapshot).flat()).not.toContain("canceled");
  });

  it("hides carried-over tasks without hiding exact-date or completed tasks", () => {
    const selectedDate = "2026-08-20";
    const snapshot = buildTaskPlannerDaySnapshot(
      [
        agendaTask({ id: "overdue", planDate: "2026-08-19" }),
        agendaTask({ id: "planned", planDate: selectedDate }),
        agendaTask({
          id: "due",
          planDate: "2026-08-19",
          deadline: selectedDate,
        }),
        agendaTask({
          id: "done",
          status: "completed",
          completedAt: "2026-08-20T09:00:00.000Z",
        }),
      ],
      selectedDate,
      {
        ...settings,
        dailyAgenda: { hideOverdueTasks: true },
      },
      selectedDate,
    );

    expect(snapshot.anytime.map((task) => task.id)).toEqual(["due", "planned"]);
    expect(snapshot.done.map((task) => task.id)).toEqual(["done"]);
    expect(
      isTaskOverdueForDay(
        agendaTask({ planDate: "2026-08-19" }),
        selectedDate,
      ),
    ).toBe(true);
    expect(
      isTaskOverdueForDay(
        agendaTask({ planDate: "2026-08-19", deadline: selectedDate }),
        selectedDate,
      ),
    ).toBe(false);
  });

  it("writes section placement, completes at the injected clock, and reopens from Done", () => {
    const at = new Date("2026-08-20T15:45:00.000Z");
    expect(
      buildTaskPlannerDaySectionPatch(
        agendaTask({ id: "open", status: "open" }),
        "evening",
        "2026-08-22",
        at,
      ),
    ).toMatchObject({
      planDate: "2026-08-22",
      planAt: "evening",
      when: "this-evening",
    });
    expect(
      buildTaskPlannerDaySectionPatch(
        agendaTask({ id: "open", status: "open" }),
        "done",
        "2026-08-22",
        at,
      ),
    ).toMatchObject({
      status: "completed",
      completedAt: at.toISOString(),
    });
    expect(
      buildTaskPlannerDaySectionPatch(
        agendaTask({
          id: "done",
          status: "completed",
          completedAt: "2026-08-20T10:00:00.000Z",
        }),
        "morning",
        "2026-08-22",
        at,
      ),
    ).toMatchObject({
      status: "open",
      completedAt: null,
      planDate: "2026-08-22",
      planAt: "morning",
    });
  });

  it("builds Monday-first weeks across month, year, and daylight-saving boundaries", () => {
    expect(buildTaskPlannerWeek("2026-01-01", "2026-01-01").map((day) => day.date)).toEqual([
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ]);
    expect(buildTaskPlannerWeek("2026-03-29", "2026-03-29").map((day) => day.date)).toEqual([
      "2026-03-23",
      "2026-03-24",
      "2026-03-25",
      "2026-03-26",
      "2026-03-27",
      "2026-03-28",
      "2026-03-29",
    ]);
  });
});
