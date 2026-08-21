import { describe, expect, it } from "vitest";
import {
  buildNaturalDateSuggestions,
  parseNaturalDueDate,
} from "./task-dates";

describe("natural task dates", () => {
  const now = new Date("2026-08-21T10:00:00");

  it("normalizes relative date language against an injected reference clock", () => {
    expect(parseNaturalDueDate("tomorrow", now)).toBe("2026-08-22");
    expect(parseNaturalDueDate("next Friday", now)).toBe("2026-08-28");
  });

  it("keeps numeric suggestions deterministic against the same clock", () => {
    expect(buildNaturalDateSuggestions("2", now).map(({ date }) => date)).toEqual([
      "2026-08-23",
      "2026-09-04",
      "2026-10-21",
    ]);
  });
});
