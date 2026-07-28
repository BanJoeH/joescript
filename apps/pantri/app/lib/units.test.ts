import { describe, expect, it } from "vitest";

import {
  convertWithinDimension,
  formatAmount,
  getUnitDimension,
  normalizeUnit,
  preferredDisplayUnit,
} from "./units";

describe("normalizeUnit", () => {
  it("maps aliases to canonical short forms", () => {
    expect(normalizeUnit("grams")).toBe("g");
    expect(normalizeUnit("Kilograms")).toBe("kg");
    expect(normalizeUnit("litre")).toBe("l");
    expect(normalizeUnit("Tablespoons")).toBe("tbsp");
  });

  it("returns null for empty/missing units", () => {
    expect(normalizeUnit(null)).toBeNull();
    expect(normalizeUnit(undefined)).toBeNull();
    expect(normalizeUnit("  ")).toBeNull();
  });

  it("passes through unknown units unchanged", () => {
    expect(normalizeUnit("pinch")).toBe("pinch");
  });
});

describe("getUnitDimension", () => {
  it("classifies mass, volume, and count units", () => {
    expect(getUnitDimension("g")).toBe("mass");
    expect(getUnitDimension("kg")).toBe("mass");
    expect(getUnitDimension("ml")).toBe("volume");
    expect(getUnitDimension("l")).toBe("volume");
    expect(getUnitDimension(null)).toBe("count");
    expect(getUnitDimension("each")).toBe("count");
  });

  it("treats unrecognised units as count", () => {
    expect(getUnitDimension("pinch")).toBe("count");
  });
});

describe("convertWithinDimension", () => {
  it("converts grams to kilograms and back", () => {
    expect(convertWithinDimension(1500, "g", "kg")).toBe(1.5);
    expect(convertWithinDimension(1.5, "kg", "g")).toBe(1500);
  });

  it("converts ml to l", () => {
    expect(convertWithinDimension(2500, "ml", "l")).toBe(2.5);
  });

  it("converts tsp/tbsp/cup within volume", () => {
    expect(convertWithinDimension(3, "tsp", "tbsp")).toBe(1);
    expect(convertWithinDimension(16, "tbsp", "cup")).toBe(1);
  });

  it("returns the same amount for identical units", () => {
    expect(convertWithinDimension(4, "g", "g")).toBe(4);
    expect(convertWithinDimension(4, null, null)).toBe(4);
  });

  it("returns null for incompatible dimensions", () => {
    expect(convertWithinDimension(4, "g", "ml")).toBeNull();
    expect(convertWithinDimension(4, "g", null)).toBeNull();
  });

  it("returns null for unrecognised units", () => {
    expect(convertWithinDimension(4, "pinch", "dash")).toBeNull();
  });
});

describe("preferredDisplayUnit", () => {
  it("prefers kg when any source used kg", () => {
    expect(preferredDisplayUnit("mass", ["g", "kg"])).toBe("kg");
    expect(preferredDisplayUnit("mass", ["g", "g"])).toBe("g");
  });

  it("prefers larger volume units when present", () => {
    expect(preferredDisplayUnit("volume", ["ml", "l"])).toBe("l");
    expect(preferredDisplayUnit("volume", ["tsp", "tbsp"])).toBe("tbsp");
    expect(preferredDisplayUnit("volume", ["ml"])).toBe("ml");
  });

  it("returns null for count dimension", () => {
    expect(preferredDisplayUnit("count", [null, "each"])).toBeNull();
  });
});

describe("formatAmount", () => {
  it("drops trailing zeros", () => {
    expect(formatAmount(1.5)).toBe("1.5");
    expect(formatAmount(2)).toBe("2");
    expect(formatAmount(1.1)).toBe("1.1");
  });

  it("rounds to two decimal places", () => {
    expect(formatAmount(1.005)).toBe("1");
    expect(formatAmount(1.256)).toBe("1.26");
  });
});
