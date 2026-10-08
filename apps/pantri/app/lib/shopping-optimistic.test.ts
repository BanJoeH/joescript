import { describe, expect, it } from "vitest";

import type { AggregatedIngredient } from "~/lib/shopping-aggregation";
import { applyShoppingListOptimistic, applySortedOptimistic } from "~/lib/shopping-optimistic";
import {
  clearShoppingPurchasedOverrides,
  setIngredientPurchasedOverride,
  setOddBitPurchasedOverride,
  setSortedPurchasedOverride,
} from "~/lib/shopping-purchased-overrides";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function aggregatedItem(
  overrides: Partial<AggregatedIngredient> & Pick<AggregatedIngredient, "canonicalName" | "name">,
): AggregatedIngredient {
  const sources = overrides.sources ?? ["Chili"];
  const instances =
    overrides.instances ??
    sources.map((source, index) => ({
      key: `${source}:1:null:false:${index}`,
      source,
      amount: 1,
      unit: null,
      purchased: overrides.purchased ?? false,
      quantityText: "1×",
    }));

  return {
    sources,
    purchased: false,
    purchasedCount: 0,
    instanceCount: instances.length,
    instances,
    amounts: [{ amount: 1, unit: null }],
    quantityLabel: "1×",
    ...overrides,
  };
}

const recipe = {
  id: "r1",
  pantryId: "p1",
  sourceRecipeId: null,
  name: "Chili",
  link: null,
  servings: null,
  ingredients: [
    { name: "beef", amount: 1, unit: "lb", purchased: false },
    { name: "onion", amount: 1, unit: null, purchased: false },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies ShoppingRecipeRecord;

describe("applyShoppingListOptimistic", () => {
  it("toggles recipe ingredients and odd bits", () => {
    const result = applyShoppingListOptimistic(
      [recipe],
      [{ name: "foil", amount: null, unit: null, purchased: false }],
      [
        {
          formData: formData({
            intent: "toggle-ingredient",
            shoppingRecipeId: "r1",
            ingredientIndex: "0",
            purchased: "true",
          }),
        },
        { formData: formData({ intent: "toggle-odd-bit", index: "0", purchased: "true" }) },
      ],
    );

    expect(result.recipes[0]?.ingredients[0]?.purchased).toBe(true);
    expect(result.recipes[0]?.ingredients[1]?.purchased).toBe(false);
    expect(result.oddBits[0]?.purchased).toBe(true);
  });

  it("persists purchased overrides after fetchers complete", () => {
    setIngredientPurchasedOverride("r1", 0, true);

    const result = applyShoppingListOptimistic([recipe], [], []);

    expect(result.recipes[0]?.ingredients[0]?.purchased).toBe(true);
  });

  it("keeps odd-bit uncheck override even when loader data already matches", () => {
    clearShoppingPurchasedOverrides();
    setOddBitPurchasedOverride(0, false);

    const first = applyShoppingListOptimistic(
      [],
      [{ name: "milk", amount: null, unit: null, purchased: false }],
      [],
    );
    expect(first.oddBits[0]?.purchased).toBe(false);

    // Matching loader data must not drop the override while sync may still be pending.
    const second = applyShoppingListOptimistic(
      [],
      [{ name: "milk", amount: null, unit: null, purchased: true }],
      [],
    );
    expect(second.oddBits[0]?.purchased).toBe(false);
  });

  it("adds and removes odd bits", () => {
    const result = applyShoppingListOptimistic(
      [],
      [
        { name: "foil", amount: null, unit: null, purchased: false },
        { name: "bags", amount: null, unit: null, purchased: false },
      ],
      [
        {
          formData: formData({
            intent: "add-odd-bit",
            name: "paper towels",
            amount: "2",
            unit: "pk",
          }),
        },
        { formData: formData({ intent: "remove-odd-bit", index: "0" }) },
      ],
    );

    expect(result.oddBits).toEqual([
      { name: "bags", amount: null, unit: null, purchased: false, sourceIndex: 1 },
      {
        name: "paper towels",
        amount: 2,
        unit: "pk",
        notes: undefined,
        purchased: false,
        sourceIndex: -1,
        pendingAdd: true,
      },
    ]);
  });

  it("toggles and removes only one of two copies of the same recipe", () => {
    const first = {
      ...recipe,
      id: "shop-1",
      sourceRecipeId: "recipe-carbonara",
      name: "Carbonara",
      ingredients: [{ name: "pasta", amount: 200, unit: "g", purchased: false }],
    } satisfies ShoppingRecipeRecord;
    const second = {
      ...recipe,
      id: "shop-2",
      sourceRecipeId: "recipe-carbonara",
      name: "Carbonara",
      ingredients: [{ name: "pasta", amount: 200, unit: "g", purchased: false }],
    } satisfies ShoppingRecipeRecord;

    const result = applyShoppingListOptimistic(
      [first, second],
      [],
      [
        {
          formData: formData({
            intent: "toggle-ingredient",
            shoppingRecipeId: "shop-1",
            ingredientIndex: "0",
            purchased: "true",
          }),
        },
        { formData: formData({ intent: "remove-recipe", shoppingRecipeId: "shop-2" }) },
      ],
    );

    expect(result.recipes).toHaveLength(1);
    expect(result.recipes[0]?.id).toBe("shop-1");
    expect(result.recipes[0]?.ingredients[0]?.purchased).toBe(true);
  });
});

describe("applySortedOptimistic", () => {
  it("toggles purchased and moves aisle", () => {
    const onion = aggregatedItem({ canonicalName: "onion", name: "onion" });
    const sections = [
      {
        section: "Produce",
        items: [onion],
      },
    ];

    const toggled = applySortedOptimistic(sections, [
      { formData: formData({ intent: "toggle", name: "onion", purchased: "true" }) },
    ]);
    expect(toggled[0]?.items[0]?.purchased).toBe(true);

    const moved = applySortedOptimistic(sections, [
      { formData: formData({ intent: "set-category", name: "onion", section: "Pantry" }) },
    ]);
    expect(moved).toEqual([
      {
        section: "Pantry",
        items: [onion],
      },
    ]);
  });

  it("keeps an uncheck after fetchers complete when loader data is still all purchased", () => {
    clearShoppingPurchasedOverrides();
    const onion = aggregatedItem({
      canonicalName: "onion",
      name: "onion",
      purchased: true,
    });
    setSortedPurchasedOverride("onion", false);

    const result = applySortedOptimistic([{ section: "Produce", items: [onion] }], []);

    expect(result[0]?.items[0]?.purchased).toBe(false);
  });
});
