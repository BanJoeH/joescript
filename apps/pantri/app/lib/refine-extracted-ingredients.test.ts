import { describe, expect, it } from "vitest";

import {
  cleanExtractedUnit,
  coerceVisionIngredient,
  parseAmountFromUnknown,
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

  it("coerces vision JSON rows that put the full line in name", () => {
    expect(
      coerceVisionIngredient({
        name: "3 garlic cloves finely chopped",
        amount: null,
        unit: null,
      }),
    ).toEqual({
      name: "garlic",
      amount: 3,
      unit: "clove",
      notes: "finely chopped",
    });
    expect(
      coerceVisionIngredient({ name: "onion", amount: 1, unit: null, notes: "finely diced" }),
    ).toEqual({
      name: "onion",
      amount: 1,
      unit: null,
      notes: "finely diced",
    });
  });

  it("parses fractional string amounts from models", () => {
    expect(parseAmountFromUnknown("1/2")).toBe(0.5);
    expect(parseAmountFromUnknown("1 1/2")).toBe(1.5);
    expect(parseAmountFromUnknown("Serves 4–6")).toBe(4);
  });

  it("parses BBC Good Food JSON-LD style lines (no comma before prep)", () => {
    expect(parseIngredientLine("oil for cooking")).toEqual({
      name: "oil",
      amount: null,
      unit: null,
      notes: "for cooking",
    });
    expect(parseIngredientLine("3 garlic cloves finely chopped")).toEqual({
      name: "garlic",
      amount: 3,
      unit: "clove",
      notes: "finely chopped",
    });
    expect(parseIngredientLine("small piece of ginger peeled and finely chopped")).toEqual({
      name: "ginger",
      amount: null,
      unit: null,
      notes: "small piece; peeled and finely chopped",
    });
    expect(parseIngredientLine("400g can of chickpeas drained and rinsed")).toEqual({
      name: "chickpeas",
      amount: 1,
      unit: "can",
      notes: "400g; drained and rinsed",
    });
    expect(
      parseIngredientLine("½ bunch of coriander leaves picked, stalks finely chopped"),
    ).toEqual({
      name: "coriander",
      amount: 0.5,
      unit: "bunch",
      notes: "leaves picked, stalks finely chopped",
    });
    expect(parseIngredientLine("1 lime juiced")).toEqual({
      name: "lime",
      amount: 1,
      unit: null,
      notes: "juiced",
    });
    expect(parseIngredientLine("wholemeal pittas to serve")).toEqual({
      name: "wholemeal pittas",
      amount: null,
      unit: null,
      notes: "to serve",
    });
    expect(parseIngredientLine("handful of spinach")).toEqual({
      name: "spinach",
      amount: null,
      unit: "handful",
    });
  });
});
