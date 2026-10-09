import { describe, expect, it } from "vitest";

import {
  ensureShoppingIngredientIds,
  mergeShoppingIngredients,
  type ShoppingIngredient,
} from "./recipe-schema";

function shopping(
  overrides: Partial<ShoppingIngredient> & Pick<ShoppingIngredient, "name" | "id">,
): ShoppingIngredient {
  return {
    amount: null,
    unit: null,
    purchased: false,
    ...overrides,
  };
}

describe("mergeShoppingIngredients", () => {
  it("preserves purchased and id when the canonical name matches", () => {
    const result = mergeShoppingIngredients(
      [shopping({ id: "a", name: "onions", amount: 2, purchased: true })],
      [{ name: "onion", amount: 3, unit: null }],
    );

    expect(result).toEqual([{ id: "a", name: "onion", amount: 3, unit: null, purchased: true }]);
  });

  it("leaves renamed and new lines unchecked with new ids", () => {
    const result = mergeShoppingIngredients(
      [shopping({ id: "a", name: "onion", purchased: true })],
      [
        { name: "shallot", amount: 1, unit: null },
        { name: "garlic", amount: 2, unit: "clove" },
      ],
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      name: "shallot",
      amount: 1,
      unit: null,
      purchased: false,
    });
    expect(result[0]?.id).toEqual(expect.any(String));
    expect(result[0]?.id).not.toBe("a");
    expect(result[1]).toMatchObject({
      name: "garlic",
      amount: 2,
      unit: "clove",
      purchased: false,
    });
  });

  it("consumes purchased tokens one-to-one for duplicate names", () => {
    const result = mergeShoppingIngredients(
      [
        shopping({ id: "a", name: "onion", purchased: true }),
        shopping({ id: "b", name: "onion", purchased: false }),
      ],
      [{ name: "onion", amount: 1, unit: null }],
    );

    expect(result).toEqual([{ id: "a", name: "onion", amount: 1, unit: null, purchased: true }]);
  });

  it("takes amount, unit, and notes from the new recipe", () => {
    const result = mergeShoppingIngredients(
      [shopping({ id: "a", name: "pasta", amount: 100, unit: "g", notes: "old", purchased: true })],
      [{ name: "pasta", amount: 200, unit: "g", notes: "fresh" }],
    );

    expect(result).toEqual([
      { id: "a", name: "pasta", amount: 200, unit: "g", notes: "fresh", purchased: true },
    ]);
  });
});

describe("ensureShoppingIngredientIds", () => {
  it("mints ids only when missing", () => {
    const { ingredients, changed } = ensureShoppingIngredientIds([
      { name: "salt", amount: null, unit: null, purchased: false, id: "kept" },
      { name: "pepper", amount: null, unit: null, purchased: true },
    ]);

    expect(changed).toBe(true);
    expect(ingredients[0]?.id).toBe("kept");
    expect(ingredients[1]?.id).toEqual(expect.any(String));
  });
});
