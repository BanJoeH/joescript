import { describe, expect, it } from "vitest";

import type { OddBit } from "~/lib/recipe-schema";
import type { AggregatedIngredient } from "~/lib/shopping-aggregation";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

import {
  mergeOddBits,
  mergeShoppingRecipes,
  mergeSortedSections,
  oddBitsFromAddFetchers,
  SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX,
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

/** Same composition the shopping list view uses. */
function viewOddBits(
  server: OddBit[],
  local: OddBit[],
  fetchers: Parameters<typeof shoppingBusyFromFetchers>[0],
) {
  const merged = mergeOddBits(server, local, shoppingBusyFromFetchers(fetchers));
  const fromAdds = oddBitsFromAddFetchers(fetchers, server);
  if (fromAdds.length === 0) return merged;
  const seen = new Set(merged.map((row) => row.id));
  return [...merged, ...fromAdds.filter((row) => !seen.has(row.id))];
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

  it("keeps the full local recipe while clear-purchased is in flight", () => {
    const server = [
      recipe({
        id: "r1",
        ingredients: [
          { id: "i1", name: "beef", amount: 1, unit: "lb", purchased: true },
          { id: "i2", name: "onion", amount: 1, unit: null, purchased: true },
        ],
      }),
    ];
    const local = [
      recipe({
        id: "r1",
        ingredients: [
          { id: "i1", name: "beef", amount: 1, unit: "lb", purchased: false },
          { id: "i2", name: "onion", amount: 1, unit: null, purchased: false },
        ],
      }),
    ];
    const busy = shoppingBusyFromFetchers([
      { formData: formData({ intent: "clear-recipe-purchased", shoppingRecipeId: "r1" }) },
    ]);

    expect(mergeShoppingRecipes(server, local, busy)).toEqual(local);
  });

  it("prefers server ingredients when nothing is busy even if local is stale", () => {
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
    const busy = shoppingBusyFromFetchers([]);

    expect(mergeShoppingRecipes(server, local, busy)[0]?.ingredients[0]?.purchased).toBe(false);
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

  it("keeps reconciled local-only bits until the loader includes them", () => {
    const server = [bit({ id: "ob1", name: "foil" })];
    const local = [bit({ id: "ob1", name: "foil" }), bit({ id: "ob2", name: "bags" })];
    const busy = shoppingBusyFromFetchers([]);

    expect(mergeOddBits(server, local, busy).map((row) => row.id)).toEqual(["ob1", "ob2"]);
  });

  it("hides odd bits with an in-flight remove", () => {
    const server = [bit({ id: "ob1", name: "foil" }), bit({ id: "ob2", name: "bags" })];
    const busy = shoppingBusyFromFetchers([
      { formData: formData({ intent: "remove-odd-bit", id: "ob1" }) },
    ]);

    expect(mergeOddBits(server, server, busy).map((row) => row.id)).toEqual(["ob2"]);
  });

  it("keeps local purchased=false while clear-all is in flight", () => {
    const server = [
      bit({ id: "ob1", name: "foil", purchased: true }),
      bit({ id: "ob2", name: "bags", purchased: true }),
    ];
    const local = [
      bit({ id: "ob1", name: "foil", purchased: false }),
      bit({ id: "ob2", name: "bags", purchased: false }),
    ];
    const busy = shoppingBusyFromFetchers([
      { formData: formData({ intent: "clear-odd-bits-purchased" }) },
    ]);

    expect(mergeOddBits(server, local, busy)).toEqual(local);
  });
});

describe("oddBitsFromAddFetchers", () => {
  it("builds a pending row from in-flight formData", () => {
    const bits = oddBitsFromAddFetchers(
      [
        {
          key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}a`,
          state: "submitting",
          formData: formData({
            intent: "add-odd-bit",
            clientPendingId: "pending:1",
            name: "bags",
            amount: "2",
            unit: "rolls",
          }),
        },
      ],
      [],
    );

    expect(bits).toEqual([bit({ id: "pending:1", name: "bags", amount: 2, unit: "rolls" })]);
  });

  it("keeps settled action odd bits until the loader includes them", () => {
    const created = bit({ id: "ob2", name: "bags" });
    const bits = oddBitsFromAddFetchers(
      [
        {
          key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}a`,
          state: "idle",
          data: { ok: true, oddBit: created, clientPendingId: "pending:1" },
        },
      ],
      [bit({ id: "ob1", name: "foil" })],
    );

    expect(bits).toEqual([created]);
  });

  it("drops settled action odd bits once they appear on the server", () => {
    const created = bit({ id: "ob2", name: "bags" });
    const bits = oddBitsFromAddFetchers(
      [
        {
          key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}a`,
          state: "idle",
          data: { ok: true, oddBit: created, clientPendingId: "pending:1" },
        },
      ],
      [created],
    );

    expect(bits).toEqual([]);
  });

  it("ignores settled errors and incomplete formData", () => {
    const bits = oddBitsFromAddFetchers(
      [
        {
          key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}err`,
          state: "idle",
          data: { error: "Nope" },
        },
        {
          key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}incomplete`,
          state: "submitting",
          formData: formData({ intent: "add-odd-bit", name: "bags" }),
        },
        {
          key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}nameless`,
          state: "submitting",
          formData: formData({
            intent: "add-odd-bit",
            clientPendingId: "pending:x",
            name: "   ",
          }),
        },
      ],
      [],
    );

    expect(bits).toEqual([]);
  });

  it("keeps concurrent pending adds from separate fetcher keys", () => {
    const bits = oddBitsFromAddFetchers(
      [
        {
          key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}a`,
          state: "submitting",
          formData: formData({
            intent: "add-odd-bit",
            clientPendingId: "pending:1",
            name: "bags",
          }),
        },
        {
          key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}b`,
          state: "loading",
          formData: formData({
            intent: "add-odd-bit",
            clientPendingId: "pending:2",
            name: "foil",
          }),
        },
      ],
      [],
    );

    expect(bits.map((row) => row.id).sort()).toEqual(["pending:1", "pending:2"]);
  });
});

describe("view odd bits composition", () => {
  it("appends fetcher adds without duplicating loader ids", () => {
    const onServer = bit({ id: "ob1", name: "foil" });
    const created = bit({ id: "ob2", name: "bags" });
    const fetchers = [
      {
        key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}a`,
        state: "idle" as const,
        data: { ok: true as const, oddBit: created, clientPendingId: "pending:1" },
      },
      {
        key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}b`,
        state: "submitting" as const,
        formData: formData({
          intent: "add-odd-bit",
          clientPendingId: "pending:2",
          name: "tape",
        }),
      },
    ];

    expect(viewOddBits([onServer, created], [onServer], fetchers).map((row) => row.id)).toEqual([
      "ob1",
      "ob2",
      "pending:2",
    ]);
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

  it("keeps local purchased while a toggle is in flight", () => {
    const onion = item({ canonicalName: "onion", name: "onion", purchased: false });
    const localOnion = { ...onion, purchased: true };
    const server = [{ section: "Produce" as const, items: [onion] }];
    const local = [{ section: "Produce" as const, items: [localOnion] }];
    const busy = sortedBusyFromFetchers([
      { formData: formData({ intent: "toggle", name: "onion", purchased: "true" }) },
    ]);

    expect(mergeSortedSections(server, local, busy)).toEqual([
      { section: "Produce", items: [localOnion] },
    ]);
  });

  it("returns the local snapshot while clear-all is in flight", () => {
    const onion = item({ canonicalName: "onion", name: "onion", purchased: true });
    const cleared = { ...onion, purchased: false };
    const server = [{ section: "Produce" as const, items: [onion] }];
    const local = [{ section: "Produce" as const, items: [cleared] }];
    const busy = sortedBusyFromFetchers([
      { formData: formData({ intent: "clear-all-purchased" }) },
    ]);

    expect(mergeSortedSections(server, local, busy)).toEqual(local);
  });
});
