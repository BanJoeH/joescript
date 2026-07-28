import { describe, expect, it } from "vitest";

import { getCanonicalIngredientName, ingredientNamesMatch } from "./ingredient-name";

describe("getCanonicalIngredientName", () => {
  it("lowercases and trims", () => {
    expect(getCanonicalIngredientName("  Onions  ")).toBe("onion");
  });

  it("singularizes only the last word", () => {
    expect(getCanonicalIngredientName("red onions")).toBe("red onion");
    expect(getCanonicalIngredientName("cherry tomatoes")).toBe("cherry tomato");
    expect(getCanonicalIngredientName("chicken thighs")).toBe("chicken thigh");
    expect(getCanonicalIngredientName("boxes")).toBe("box");
  });

  it("keeps known non-plural foods intact", () => {
    expect(getCanonicalIngredientName("asparagus")).toBe("asparagus");
    expect(getCanonicalIngredientName("couscous")).toBe("couscous");
  });

  it("does not mangle short or already-singular words", () => {
    expect(getCanonicalIngredientName("peas")).toBe("pea");
    expect(getCanonicalIngredientName("hummus")).toBe("hummus");
    expect(getCanonicalIngredientName("swiss")).toBe("swiss");
  });

  it("collapses internal whitespace", () => {
    expect(getCanonicalIngredientName("red   onions")).toBe("red onion");
  });
});

describe("ingredientNamesMatch", () => {
  it("matches names that canonicalize to the same value", () => {
    expect(ingredientNamesMatch("Onion", "onions")).toBe(true);
    expect(ingredientNamesMatch("Red Onions", "red onion")).toBe(true);
  });

  it("does not match unrelated names", () => {
    expect(ingredientNamesMatch("onion", "garlic")).toBe(false);
  });

  it("handles undefined input", () => {
    expect(ingredientNamesMatch(undefined, undefined)).toBe(true);
    expect(ingredientNamesMatch("onion", undefined)).toBe(false);
  });
});
