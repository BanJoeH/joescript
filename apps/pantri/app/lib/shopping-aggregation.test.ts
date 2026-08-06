import { describe, expect, it } from "vitest";

import {
  aggregateIngredients,
  getSortedQuantityBadge,
  type ShoppingLine,
} from "./shopping-aggregation";

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

  it("sums grams and ounces into a metric total", () => {
    const result = aggregateIngredients([
      line({ name: "cheese", amount: 500, unit: "g", source: "Pasta" }),
      line({ name: "cheese", amount: 8, unit: "oz", source: "Tacos" }),
    ]);

    expect(result[0].amounts).toEqual([{ amount: 727, unit: "g" }]);
    expect(getSortedQuantityBadge(result[0])).toBe("0/2");
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
    expect(result[0].instanceCount).toBe(2);
    expect(result[0].instances).toEqual([
      {
        key: "Curry:null:null:false:0",
        source: "Curry",
        amount: null,
        unit: null,
        purchased: false,
        quantityText: "—",
      },
      {
        key: "Soup:null:null:false:1",
        source: "Soup",
        amount: null,
        unit: null,
        purchased: false,
        quantityText: "—",
      },
    ]);
  });

  it("tracks partial purchase progress per instance", () => {
    const result = aggregateIngredients([
      line({ name: "garlic", source: "Cassoulet", purchased: true }),
      line({ name: "garlic", source: "Shepherds pie", purchased: false }),
    ]);

    expect(result[0].purchased).toBe(false);
    expect(result[0].purchasedCount).toBe(1);
    expect(result[0].instanceCount).toBe(2);
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

describe("getSortedQuantityBadge", () => {
  it("shows instance progress for multiple lines without amounts", () => {
    const [garlic] = aggregateIngredients([
      line({ name: "garlic", source: "Chip chip cassoulet" }),
      line({ name: "garlic", source: "Shepherds pie" }),
    ]);

    expect(getSortedQuantityBadge(garlic)).toBe("0/2");
  });

  it("shows instance progress when some amounts are missing", () => {
    const [garlic] = aggregateIngredients([
      line({ name: "garlic", amount: 2, unit: "clove", source: "Stew" }),
      line({ name: "garlic", amount: 3, unit: "clove", source: "Soup" }),
      line({ name: "garlic", source: "Shepherds pie" }),
    ]);

    expect(getSortedQuantityBadge(garlic)).toBe("0/3");
    expect(garlic.instances.map((instance) => instance.quantityText)).toEqual([
      "2 cloves",
      "3 cloves",
      "—",
    ]);
  });

  it("shows instance progress instead of summed total for multiple lines", () => {
    const [garlic] = aggregateIngredients([
      line({ name: "garlic", amount: 2, unit: "clove", source: "Stew" }),
      line({ name: "garlic", amount: 3, unit: "clove", source: "Soup" }),
    ]);

    expect(getSortedQuantityBadge(garlic)).toBe("0/2");
    expect(garlic.amounts).toEqual([{ amount: 5, unit: "clove" }]);
  });

  it("shows instance progress for compatible mass units across recipes", () => {
    const [flour] = aggregateIngredients([
      line({ name: "flour", amount: 500, unit: "g", source: "Bread" }),
      line({ name: "flour", amount: 500, unit: "g", source: "Cake" }),
    ]);

    expect(flour.amounts).toEqual([{ amount: 1, unit: "kg" }]);
    expect(getSortedQuantityBadge(flour)).toBe("0/2");
  });

  it("hides badge for a single unspecified line", () => {
    const [garlic] = aggregateIngredients([line({ name: "garlic", source: "Cassoulet" })]);

    expect(getSortedQuantityBadge(garlic)).toBeNull();
  });

  it("shows amount for a single recipe with a quantity", () => {
    const [flour] = aggregateIngredients([
      line({ name: "flour", amount: 500, unit: "g", source: "Bread" }),
    ]);

    expect(getSortedQuantityBadge(flour)).toBe("500g");
  });

  it("shows instance progress for multiple lines on one recipe", () => {
    const [chicken] = aggregateIngredients([
      line({ name: "chicken", amount: 500, unit: "g", source: "Curry" }),
      line({ name: "chicken", amount: 2, unit: null, source: "Curry" }),
    ]);

    expect(getSortedQuantityBadge(chicken)).toBe("0/2");
  });

  it("shows only progress when partially purchased", () => {
    const [carrots] = aggregateIngredients([
      line({ name: "carrots", source: "Bean soup", purchased: false }),
      line({ name: "carrots", source: "Shepherds pie", purchased: true }),
    ]);

    expect(getSortedQuantityBadge(carrots)).toBe("1/2");
  });

  it("shows only progress when partially purchased", () => {
    const [carrots] = aggregateIngredients([
      line({ name: "carrots", source: "Bean soup", purchased: false }),
      line({ name: "carrots", source: "Shepherds pie", purchased: true }),
    ]);

    expect(getSortedQuantityBadge(carrots)).toBe("1/2");
  });

  it("shows full progress when every instance is purchased", () => {
    const [garlic] = aggregateIngredients([
      line({ name: "garlic", amount: 3, unit: "clove", source: "Stew", purchased: true }),
      line({ name: "garlic", amount: 3, unit: "clove", source: "Soup", purchased: true }),
    ]);

    expect(getSortedQuantityBadge(garlic)).toBe("2/2");
  });
});
