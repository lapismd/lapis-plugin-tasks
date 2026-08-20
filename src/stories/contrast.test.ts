import { describe, expect, it } from "vitest";

import { colorContrastRatio, compositeColor, parseCssColor } from "./contrast";

describe("Storybook contrast helpers", () => {
  it("parses browser computed RGB, sRGB, and OKLCH colors", () => {
    expect(parseCssColor("rgb(255 0 128 / 50%)")).toEqual({
      red: 255,
      green: 0,
      blue: 128,
      alpha: 0.5,
    });
    expect(parseCssColor("color(srgb 1 0.5 0 / 0.75)")).toEqual({
      red: 255,
      green: 127.5,
      blue: 0,
      alpha: 0.75,
    });
    const white = parseCssColor("oklch(100% 0 0)");
    expect(white.red).toBeCloseTo(255, 3);
    expect(white.green).toBeCloseTo(255, 3);
    expect(white.blue).toBeCloseTo(255, 3);
  });

  it("computes WCAG contrast after alpha compositing", () => {
    const black = parseCssColor("#000");
    const white = parseCssColor("#fff");
    expect(colorContrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(
      compositeColor(parseCssColor("rgb(255 255 255 / 50%)"), black),
    ).toEqual({ red: 127.5, green: 127.5, blue: 127.5, alpha: 1 });
  });
});
