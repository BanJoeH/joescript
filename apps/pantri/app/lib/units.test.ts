import { describe, expect, it } from "vitest";

import {
  convertWithinDimension,
  formatAmount,
  formatAmountWithUnit,
  formatIngredientLabel,
  getUnitDimension,
  normalizeAggregatedAmount,
  normalizeUnit,
  preferredDisplayUnit,
  roundAmountForUnit,
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
    expect(getUnitDimension("oz")).toBe("mass");
    expect(getUnitDimension("lb")).toBe("mass");
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

  it("converts grams and imperial mass units", () => {
    expect(convertWithinDimension(16, "oz", "lb")).toBe(1);
    expect(convertWithinDimension(1, "lb", "oz")).toBe(16);
    expect(convertWithinDimension(8, "oz", "g")).toBeCloseTo(226.8, 1);
    expect(convertWithinDimension(500, "g", "oz")).toBeCloseTo(17.64, 2);
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

  it("prefers metric when mass units are mixed", () => {
    expect(preferredDisplayUnit("mass", ["g", "oz"])).toBe("g");
    expect(preferredDisplayUnit("mass", ["oz"])).toBe("oz");
    expect(preferredDisplayUnit("mass", ["lb", "oz"])).toBe("lb");
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

describe("roundAmountForUnit", () => {
  it("rounds small mass and volume units to whole numbers", () => {
    expect(roundAmountForUnit(726.8, "g")).toBe(727);
    expect(roundAmountForUnit(249.2, "ml")).toBe(249);
    expect(roundAmountForUnit(17.64, "oz")).toBe(18);
  });

  it("keeps sensible precision for kg, l, and lb", () => {
    expect(roundAmountForUnit(1.556, "kg")).toBe(1.56);
    expect(roundAmountForUnit(0.75, "l")).toBe(0.75);
    expect(roundAmountForUnit(1.625, "lb")).toBe(1.63);
  });

  it("rounds cooking volumes to quarter steps", () => {
    expect(roundAmountForUnit(1.3, "cup")).toBe(1.25);
    expect(roundAmountForUnit(2.4, "tbsp")).toBe(2.5);
  });
});

describe("normalizeAggregatedAmount", () => {
  it("upgrades grams to kilograms at 1kg+", () => {
    expect(normalizeAggregatedAmount(1500, "g", "mass")).toEqual({ amount: 1.5, unit: "kg" });
    expect(normalizeAggregatedAmount(726.8, "g", "mass")).toEqual({ amount: 727, unit: "g" });
  });

  it("upgrades ounces to pounds at 1lb+", () => {
    expect(normalizeAggregatedAmount(20, "oz", "mass")).toEqual({ amount: 1.25, unit: "lb" });
  });

  it("upgrades millilitres to litres at 1l+", () => {
    expect(normalizeAggregatedAmount(2500, "ml", "volume")).toEqual({ amount: 2.5, unit: "l" });
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

describe("formatAmountWithUnit", () => {
  it("formats attached and spaced units", () => {
    expect(formatAmountWithUnit(300, "g")).toBe("300g");
    expect(formatAmountWithUnit(3, "clove")).toBe("3 cloves");
    expect(formatAmountWithUnit(1, "cup")).toBe("1 cup");
  });

  it("formats unitless counts", () => {
    expect(formatAmountWithUnit(3, null)).toBe("3×");
  });
});

describe("formatIngredientLabel", () => {
  it("joins formatted quantity with name and notes", () => {
    expect(
      formatIngredientLabel({ name: "garlic", amount: 3, unit: "clove", notes: "minced" }),
    ).toBe("3 cloves garlic (minced)");
    expect(formatIngredientLabel({ name: "flour", amount: 500, unit: "g" })).toBe("500g flour");
    expect(formatIngredientLabel({ name: "salt", amount: null, unit: null })).toBe("salt");
  });
});
