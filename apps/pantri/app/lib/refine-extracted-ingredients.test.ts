import { describe, expect, it } from "vitest";

import {
  cleanExtractedUnit,
  parseIngredientLine,
  refineExtractedIngredients,
} from "~/lib/refine-extracted-ingredients";

describe("refineExtractedIngredients", () => {
  it("splits comma-separated food lists into separate ingredients", () => {
    expect(
      refineExtractedIngredients([{ name: "beef, onion, chili powder", amount: 1, unit: "cup" }]),
    ).toEqual([
      { name: "beef", amount: null, unit: null },
      { name: "onion", amount: null, unit: null },
      { name: "chili powder", amount: null, unit: null },
    ]);
  });

  it("moves trailing prep into notes instead of splitting", () => {
    expect(
      refineExtractedIngredients([{ name: "garlic cloves, minced", amount: 3, unit: "clove" }]),
    ).toEqual([{ name: "garlic cloves", amount: 3, unit: "clove", notes: "minced" }]);
  });

  it("moves leading prep into notes", () => {
    expect(
      refineExtractedIngredients([{ name: "finely diced green chiles", amount: 1, unit: "can" }]),
    ).toEqual([{ name: "green chiles", amount: 1, unit: "can", notes: "finely diced" }]);
  });

  it("cleans bogus numeric units", () => {
    expect(cleanExtractedUnit("1")).toBeNull();
    expect(cleanExtractedUnit("4-ounce")).toBe("oz");
    expect(cleanExtractedUnit("tbsp")).toBe("tbsp");
  });

  it("parses free-text ingredient lines into structured fields", () => {
    expect(parseIngredientLine("1 tablespoon vegetable oil")).toEqual({
      name: "vegetable oil",
      amount: 1,
      unit: "tbsp",
    });
    expect(parseIngredientLine("1/4 teaspoon salt")).toEqual({
      name: "salt",
      amount: 0.25,
      unit: "tsp",
    });
    expect(parseIngredientLine("1 medium onion, finely diced")).toEqual({
      name: "medium onion",
      amount: 1,
      unit: null,
      notes: "finely diced",
    });
    expect(parseIngredientLine("3 garlic cloves, minced")).toEqual({
      name: "garlic",
      amount: 3,
      unit: "clove",
      notes: "minced",
    });
    expect(parseIngredientLine("1/4 cup shredded Monterey Jack, divided")).toEqual({
      name: "monterey jack",
      amount: 0.25,
      unit: "cup",
      notes: "divided; shredded",
    });
  });
});
