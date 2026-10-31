import { describe, expect, it } from "vitest";

import { resolveTurboConcurrency } from "./lib/concurrency.mjs";

describe("Turbo concurrency", () => {
  it("defaults to half the processors capped at four", () => {
    expect(resolveTurboConcurrency({}, 1)).toBe("1");
    expect(resolveTurboConcurrency({}, 6)).toBe("3");
    expect(resolveTurboConcurrency({}, 32)).toBe("4");
  });

  it("accepts numeric and percentage overrides", () => {
    expect(resolveTurboConcurrency({ TURBO_CONCURRENCY: "2" }, 32)).toBe("2");
    expect(resolveTurboConcurrency({ TURBO_CONCURRENCY: "50%" }, 32)).toBe(
      "50%",
    );
    expect(() => resolveTurboConcurrency({ TURBO_CONCURRENCY: "0" }, 4)).toThrow(
      /positive integer/,
    );
  });
});
