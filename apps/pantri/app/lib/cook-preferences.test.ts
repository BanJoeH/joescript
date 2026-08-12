import { describe, expect, it } from "vitest";

import {
  COOK_INGREDIENT_TEXT_CLASS,
  COOK_STEP_TEXT_CLASS,
  isCookTextSize,
  nextCookTextSize,
} from "./cook-preferences";

describe("cook-preferences", () => {
  it("validates text size values", () => {
    expect(isCookTextSize(0)).toBe(true);
    expect(isCookTextSize(2)).toBe(true);
    expect(isCookTextSize(3)).toBe(false);
    expect(isCookTextSize("1")).toBe(false);
  });

  it("cycles text sizes", () => {
    expect(nextCookTextSize(0)).toBe(1);
    expect(nextCookTextSize(1)).toBe(2);
    expect(nextCookTextSize(2)).toBe(0);
  });

  it("maps sizes to text classes", () => {
    expect(COOK_STEP_TEXT_CLASS[0]).toBe("text-lg");
    expect(COOK_STEP_TEXT_CLASS[2]).toBe("text-2xl");
    expect(COOK_INGREDIENT_TEXT_CLASS[1]).toBe("text-lg");
  });
});
