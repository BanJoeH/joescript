import { describe, expect, it } from "vitest";

import type { OddBit } from "~/lib/recipe-schema";
import type { AggregatedIngredient } from "~/lib/shopping-aggregation";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

import {
  mergeOddBits,
  mergeShoppingRecipes,
  mergeSortedSections,
  replacePendingOddBit,
  shoppingBusyFromFetchers,
  sortedBusyFromFetchers,
} from "./shopping-local-merge";

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function recipe(
  overrides: Partial<ShoppingRecipeRecord> & Pick<ShoppingRecipeRecord, "id" | "ingredients">,
): ShoppingRecipeRecord {
  return {
    pantryId: "p1",
    sourceRecipeId: null,
    name: "Chili",
    link: null,
    servings: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  };
}

function bit(overrides: Partial<OddBit> & Pick<OddBit, "id" | "name">): OddBit {
  return {
    amount: null,
    unit: null,
    purchased: false,
    ...overrides,
  };
}

function item(
  overrides: Partial<AggregatedIngredient> & Pick<AggregatedIngredient, "canonicalName" | "name">,
): AggregatedIngredient {
  return {
    sources: ["Chili"],
    purchased: false,
    purchasedCount: 0,
    instanceCount: 1,
    instances: [],
    amounts: [],
    quantityLabel: "",
    ...overrides,
  };
}

describe("shoppingBusyFromFetchers", () => {
  it("collects in-flight shopping intents", () => {
    const busy = shoppingBusyFromFetchers([
      {
        formData: formData({
          intent: "toggle-ingredient",
          shoppingRecipeId: "r1",
          ingredientId: "i1",
        }),
      },
      { formData: formData({ intent: "remove-odd-bit", id: "ob1" }) },
      { formData: formData({ intent: "clear-odd-bits-purchased" }) },
    ]);

    expect([...busy.ingredientKeys]).toEqual(["r1:i1"]);
    expect([...busy.oddBitRemoves]).toEqual(["ob1"]);
    expect(busy.oddBitClears).toBe(true);
  });
});

describe("mergeShoppingRecipes", () => {
  it("keeps local purchased while a toggle is in flight", () => {
    const server = [
      recipe({
        id: "r1",
        ingredients: [{ id: "i1", name: "beef", amount: 1, unit: "lb", purchased: false }],
      }),
    ];
    const local = [
      recipe({
        id: "r1",
        ingredients: [{ id: "i1", name: "beef", amount: 1, unit: "lb", purchased: true }],
      }),
    ];
    const busy = shoppingBusyFromFetchers([
      {
        formData: formData({
          intent: "toggle-ingredient",
          shoppingRecipeId: "r1",
          ingredientId: "i1",
        }),
      },
    ]);

    expect(mergeShoppingRecipes(server, local, busy)[0]?.ingredients[0]?.purchased).toBe(true);
  });

  it("hides recipes with an in-flight remove", () => {
    const server = [recipe({ id: "r1", ingredients: [] })];
    const busy = shoppingBusyFromFetchers([
      { formData: formData({ intent: "remove-recipe", shoppingRecipeId: "r1" }) },
    ]);
    expect(mergeShoppingRecipes(server, server, busy)).toEqual([]);
  });
});

describe("mergeOddBits", () => {
  it("preserves pending adds and busy toggles", () => {
    const server = [bit({ id: "ob1", name: "foil", purchased: false })];
    const local = [
      bit({ id: "ob1", name: "foil", purchased: true }),
      bit({ id: "pending:1", name: "bags" }),
    ];
    const busy = shoppingBusyFromFetchers([
      { formData: formData({ intent: "toggle-odd-bit", id: "ob1", purchased: "true" }) },
    ]);

    expect(mergeOddBits(server, local, busy)).toEqual([
      bit({ id: "ob1", name: "foil", purchased: true }),
      bit({ id: "pending:1", name: "bags" }),
    ]);
  });
});

describe("replacePendingOddBit", () => {
  it("swaps the pending row for the server odd bit", () => {
    const result = replacePendingOddBit(
      [bit({ id: "pending:abc", name: "bags" }), bit({ id: "ob1", name: "foil" })],
      "pending:abc",
      bit({ id: "ob2", name: "bags" }),
    );
    expect(result.map((row) => row.id)).toEqual(["ob1", "ob2"]);
  });
});

describe("mergeSortedSections", () => {
  it("keeps local aisle while a move is in flight", () => {
    const onion = item({ canonicalName: "onion", name: "onion" });
    const server = [{ section: "Produce" as const, items: [onion] }];
    const local = [{ section: "Pantry" as const, items: [onion] }];
    const busy = sortedBusyFromFetchers([
      { formData: formData({ intent: "set-category", name: "onion", section: "Pantry" }) },
    ]);

    expect(mergeSortedSections(server, local, busy)).toEqual([
      { section: "Pantry", items: [onion] },
    ]);
  });
});
