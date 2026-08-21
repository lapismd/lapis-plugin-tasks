import { describe, expect, it } from "vitest";
import { appendDetailColumn, unwindDetailColumns } from "./detail-column-stack";

describe("detail column stack", () => {
  it("appends descendants without replacing their ancestors", () => {
    const first = appendDetailColumn([], -1, "release-train");
    const second = appendDetailColumn(first, 0, "coordinate-launch");
    const third = appendDetailColumn(second, 1, "launch-operations");

    expect(third).toEqual([
      "release-train",
      "coordinate-launch",
      "launch-operations",
    ]);
  });

  it("replaces only the descendant branch selected from an ancestor", () => {
    expect(
      appendDetailColumn(
        ["release-train", "coordinate-launch", "launch-operations"],
        0,
        "alternative-task",
      ),
    ).toEqual(["release-train", "alternative-task"]);
  });

  it("unwinds the closed column and its descendants", () => {
    expect(
      unwindDetailColumns(
        ["release-train", "coordinate-launch", "launch-operations"],
        1,
      ),
    ).toEqual(["release-train"]);
  });
});
