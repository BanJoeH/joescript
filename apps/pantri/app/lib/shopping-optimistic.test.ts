import { describe, expect, it } from "vitest";

import { applyShoppingListOptimistic, applySortedOptimistic } from "~/lib/shopping-optimistic";
import { setIngredientPurchasedOverride } from "~/lib/shopping-purchased-overrides";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
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
});

describe("applySortedOptimistic", () => {
  it("toggles purchased and moves aisle", () => {
    const sections = [
      {
        section: "Produce",
        items: [
          {
            canonicalName: "onion",
            name: "onion",
            sources: ["Chili"],
            purchased: false,
            amounts: [],
            quantityLabel: "1",
          },
        ],
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
        items: [
          {
            canonicalName: "onion",
            name: "onion",
            sources: ["Chili"],
            purchased: false,
            amounts: [],
            quantityLabel: "1",
          },
        ],
      },
    ]);
  });
});
