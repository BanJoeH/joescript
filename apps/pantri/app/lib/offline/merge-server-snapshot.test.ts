import { describe, expect, it } from "vitest";

import { mergeServerSnapshotWithLocal } from "~/lib/offline/merge-server-snapshot";
import type { ShoppingSnapshot } from "~/lib/offline/types";

function snap(overrides: Partial<ShoppingSnapshot>): ShoppingSnapshot {
  return {
    pantryId: "p1",
    updatedAt: 1,
    shoppingRecipes: [],
    oddBits: [],
    categoryOverrides: {},
    ...overrides,
  };
}

describe("mergeServerSnapshotWithLocal", () => {
  it("keeps local purchased when the server pull is behind and queues a repair", () => {
    const local = snap({
      oddBits: [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: true }],
      shoppingRecipes: [
        {
          id: "r1",
          pantryId: "p1",
          sourceRecipeId: null,
          name: "Chili",
          link: null,
          servings: null,
          createdAt: "2020-01-01T00:00:00.000Z",
          updatedAt: "2020-01-01T00:00:00.000Z",
          ingredients: [{ id: "i1", name: "onion", amount: 1, unit: null, purchased: true }],
        },
      ],
    });
    const server = snap({
      oddBits: [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: false }],
      shoppingRecipes: [
        {
          id: "r1",
          pantryId: "p1",
          sourceRecipeId: null,
          name: "Chili",
          link: null,
          servings: null,
          createdAt: "2020-01-01T00:00:00.000Z",
          updatedAt: "2020-01-01T00:00:00.000Z",
          ingredients: [{ id: "i1", name: "onion", amount: 1, unit: null, purchased: false }],
        },
      ],
    });

    const { merged, repairs } = mergeServerSnapshotWithLocal("p1", server, local);

    expect(merged.oddBits[0]?.purchased).toBe(true);
    expect(merged.shoppingRecipes[0]?.ingredients[0]?.purchased).toBe(true);
    expect(repairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fields: { intent: "toggle-odd-bit", id: "ob1", purchased: "true" },
        }),
        expect.objectContaining({
          fields: { intent: "toggle", name: "onion", purchased: "true" },
        }),
      ]),
    );
  });

  it("does not repair when local and server already agree", () => {
    const bits = [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: true }];
    const { repairs } = mergeServerSnapshotWithLocal(
      "p1",
      snap({ oddBits: bits }),
      snap({ oddBits: bits }),
    );
    expect(repairs).toEqual([]);
  });
});
