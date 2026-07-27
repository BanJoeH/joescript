import { describe, expect, it } from "vitest";

import { aggregateIngredients, type ShoppingLine } from "./shopping-aggregation";

function line(overrides: Partial<ShoppingLine> & { name: string }): ShoppingLine {
  return {
    amount: null,
    unit: null,
    purchased: false,
    source: "Recipe",
    ...overrides,
  };
}

describe("aggregateIngredients", () => {
  it("groups by canonical name across recipes", () => {
    const result = aggregateIngredients([
      line({ name: "onion", amount: 2, unit: null, source: "Chilli" }),
      line({ name: "onions", amount: 1, unit: null, source: "Soup" }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].canonicalName).toBe("onion");
    expect(result[0].sources).toEqual(["Chilli", "Soup"]);
  });

  it("sums compatible mass units, preferring kg when present", () => {
    const result = aggregateIngredients([
      line({ name: "flour", amount: 500, unit: "g", source: "Bread" }),
      line({ name: "flour", amount: 1.5, unit: "kg", source: "Cake" }),
    ]);

    expect(result[0].amounts).toEqual([{ amount: 2, unit: "kg" }]);
    expect(result[0].quantityLabel).toBe("2kg");
  });

  it("sums compatible volume units", () => {
    const result = aggregateIngredients([
      line({ name: "milk", amount: 250, unit: "ml", source: "Pancakes" }),
      line({ name: "milk", amount: 0.5, unit: "l", source: "Custard" }),
    ]);

    expect(result[0].amounts).toEqual([{ amount: 0.75, unit: "l" }]);
  });

  it("sums plain counts", () => {
    const result = aggregateIngredients([
      line({ name: "egg", amount: 2, unit: null, source: "Cake" }),
      line({ name: "eggs", amount: 3, unit: "each", source: "Omelette" }),
    ]);

    expect(result[0].amounts).toEqual([{ amount: 5, unit: null }]);
    expect(result[0].quantityLabel).toBe("5\u00d7");
  });

  it("keeps incompatible dimensions as separate amounts with a split label", () => {
    const result = aggregateIngredients([
      line({ name: "chicken", amount: 500, unit: "g", source: "Curry" }),
      line({ name: "chicken", amount: 2, unit: null, source: "Roast" }),
    ]);

    expect(result[0].amounts).toEqual([
      { amount: 500, unit: "g" },
      { amount: 2, unit: null },
    ]);
    expect(result[0].quantityLabel).toBe("500g + 2\u00d7");
  });

  it("counts lines with no amount at all", () => {
    const result = aggregateIngredients([
      line({ name: "salt", source: "Curry" }),
      line({ name: "salt", source: "Soup" }),
    ]);

    expect(result[0].amounts).toEqual([{ amount: 2, unit: null }]);
  });

  it("is purchased only when every instance is purchased", () => {
    const partiallyPurchased = aggregateIngredients([
      line({ name: "rice", amount: 1, unit: "kg", purchased: true, source: "A" }),
      line({ name: "rice", amount: 1, unit: "kg", purchased: false, source: "B" }),
    ]);
    expect(partiallyPurchased[0].purchased).toBe(false);

    const fullyPurchased = aggregateIngredients([
      line({ name: "rice", amount: 1, unit: "kg", purchased: true, source: "A" }),
      line({ name: "rice", amount: 1, unit: "kg", purchased: true, source: "B" }),
    ]);
    expect(fullyPurchased[0].purchased).toBe(true);
  });

  it("sorts rows alphabetically by name", () => {
    const result = aggregateIngredients([
      line({ name: "zucchini", source: "A" }),
      line({ name: "apple", source: "B" }),
    ]);
    expect(result.map((r) => r.name)).toEqual(["apple", "zucchini"]);
  });

  it("returns an empty array for no lines", () => {
    expect(aggregateIngredients([])).toEqual([]);
  });
});
