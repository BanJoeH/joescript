import { describe, expect, it } from "vitest";

import { mergeShoppingIngredients, type ShoppingIngredient } from "./recipe-schema";

function shopping(
  overrides: Partial<ShoppingIngredient> & Pick<ShoppingIngredient, "name">,
): ShoppingIngredient {
  return {
    amount: null,
    unit: null,
    purchased: false,
    ...overrides,
  };
}

describe("mergeShoppingIngredients", () => {
  it("preserves purchased when the canonical name matches", () => {
    const result = mergeShoppingIngredients(
      [shopping({ name: "onions", amount: 2, purchased: true })],
      [{ name: "onion", amount: 3, unit: null }],
    );

    expect(result).toEqual([{ name: "onion", amount: 3, unit: null, purchased: true }]);
  });

  it("leaves renamed and new lines unchecked", () => {
    const result = mergeShoppingIngredients(
      [shopping({ name: "onion", purchased: true })],
      [
        { name: "shallot", amount: 1, unit: null },
        { name: "garlic", amount: 2, unit: "clove" },
      ],
    );

    expect(result).toEqual([
      { name: "shallot", amount: 1, unit: null, purchased: false },
      { name: "garlic", amount: 2, unit: "clove", purchased: false },
    ]);
  });

  it("consumes purchased tokens one-to-one for duplicate names", () => {
    const result = mergeShoppingIngredients(
      [shopping({ name: "onion", purchased: true }), shopping({ name: "onion", purchased: false })],
      [{ name: "onion", amount: 1, unit: null }],
    );

    expect(result).toEqual([{ name: "onion", amount: 1, unit: null, purchased: true }]);
  });

  it("takes amount, unit, and notes from the new recipe", () => {
    const result = mergeShoppingIngredients(
      [shopping({ name: "pasta", amount: 100, unit: "g", notes: "old", purchased: true })],
      [{ name: "pasta", amount: 200, unit: "g", notes: "fresh" }],
    );

    expect(result).toEqual([
      { name: "pasta", amount: 200, unit: "g", notes: "fresh", purchased: true },
    ]);
  });
});
