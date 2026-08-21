import { describe, expect, it } from "vitest";
import {
  analyzeRecurrenceRule,
  RecurrenceEngine,
  UnsupportedRecurrenceRuleError,
} from "./recurrence-engine";

describe("RecurrenceEngine", () => {
  it("includes DTSTART even when rrule.js would omit a non-matching start", () => {
    const engine = new RecurrenceEngine({
      start: "2026-08-21",
      rrule: "FREQ=MONTHLY;COUNT=3;BYDAY=MO;BYSETPOS=1",
    });
    expect(engine.between("2026-08-01", "2026-11-30")).toEqual([
      "2026-08-21",
      "2026-09-07",
      "2026-10-05",
      "2026-11-02",
    ]);
  });

  it("keeps calendar month and leap-year behavior instead of fixed days", () => {
    const monthly = new RecurrenceEngine({
      start: "2026-01-31",
      rrule: "FREQ=MONTHLY;COUNT=4",
    });
    expect(monthly.between("2026-01-01", "2026-06-01")).toEqual([
      "2026-01-31",
      "2026-03-31",
      "2026-05-31",
    ]);
    const yearly = new RecurrenceEngine({
      start: "2024-02-29",
      rrule: "FREQ=YEARLY;COUNT=3",
    });
    expect(yearly.between("2024-01-01", "2033-01-01")).toEqual([
      "2024-02-29",
      "2028-02-29",
      "2032-02-29",
    ]);
  });

  it("supports intervals, weekdays, positional rules, and date-only UNTIL", () => {
    const interval = new RecurrenceEngine({
      start: "2026-08-03",
      rrule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;WKST=MO;UNTIL=20260831",
    });
    expect(interval.between("2026-08-01", "2026-09-01")).toEqual([
      "2026-08-03",
      "2026-08-05",
      "2026-08-17",
      "2026-08-19",
      "2026-08-31",
    ]);
    const lastWeekday = new RecurrenceEngine({
      start: "2026-08-01",
      rrule:
        "FREQ=MONTHLY;COUNT=3;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1",
    });
    expect(lastWeekday.between("2026-08-01", "2026-10-31")).toEqual([
      "2026-08-01",
      "2026-08-31",
      "2026-09-30",
      "2026-10-30",
    ]);
  });

  it("composes RDATE and EXDATE with exclusion precedence", () => {
    const engine = new RecurrenceEngine({
      start: "2026-08-21",
      rrule: "FREQ=DAILY;COUNT=3",
      rdate: ["2026-08-30"],
      exdate: ["2026-08-21", "2026-08-22", "2026-08-30"],
    });
    expect(engine.between("2026-08-20", "2026-08-31")).toEqual([
      "2026-08-23",
    ]);
  });

  it("exposes date-only next, previous, between, and exhaustion", () => {
    const engine = new RecurrenceEngine({
      start: "2026-08-21",
      rrule: "FREQ=DAILY;COUNT=2",
    });
    expect(engine.next("2026-08-21")).toBe("2026-08-22");
    expect(engine.next("2026-08-22")).toBeNull();
    expect(engine.previous("2026-08-22")).toBe("2026-08-21");
    expect(engine.between("2026-08-21", "2026-08-22")).toEqual([
      "2026-08-21",
      "2026-08-22",
    ]);
  });

  it("preserves valid rules outside the executable subset and rejects invalid rules", () => {
    expect(analyzeRecurrenceRule("FREQ=HOURLY;BYMINUTE=15")).toEqual({
      status: "unsupported",
      parts: ["BYMINUTE", "FREQ=HOURLY"],
    });
    expect(
      analyzeRecurrenceRule("FREQ=DAILY;COUNT=2;UNTIL=20260830"),
    ).toMatchObject({ status: "invalid" });
    expect(analyzeRecurrenceRule("RRULE:FREQ=DAILY")).toMatchObject({
      status: "invalid",
    });
    expect(
      () =>
        new RecurrenceEngine({
          start: "2026-08-21",
          rrule: "FREQ=HOURLY",
        }),
    ).toThrow(UnsupportedRecurrenceRuleError);
  });
});
