import { afterEach, describe, expect, it } from "vitest";

import { mergeServerSnapshotWithLocal } from "~/lib/offline/merge-server-snapshot";
import {
  rememberFoldedPurchasedProtection,
  resetPurchasedProtectionForTests,
} from "~/lib/offline/purchased-protection";
import type { OutboxEntry, ShoppingSnapshot } from "~/lib/offline/types";

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

function pending(fields: Record<string, string>): OutboxEntry {
  return {
    id: "e1",
    pantryId: "p1",
    createdAt: 1,
    actionPath: "/p1/shopping",
    fields,
    status: "pending",
  };
}

afterEach(() => {
  resetPurchasedProtectionForTests();
});

describe("mergeServerSnapshotWithLocal", () => {
  it("keeps local purchased and queues a repair when outbox still covers the row", () => {
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

    const { merged, repairs } = mergeServerSnapshotWithLocal("p1", server, local, {
      pendingOutbox: [
        pending({ intent: "toggle-odd-bit", id: "ob1", purchased: "true" }),
        pending({ intent: "toggle", name: "onion", purchased: "true" }),
      ],
    });

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

  it("accepts server purchased when there is no pending outbox (other device won)", () => {
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

    const { merged, repairs } = mergeServerSnapshotWithLocal("p1", server, local, {
      pendingOutbox: [],
    });

    expect(merged.oddBits[0]?.purchased).toBe(false);
    expect(merged.shoppingRecipes[0]?.ingredients[0]?.purchased).toBe(false);
    expect(repairs).toEqual([]);
  });

  it("still protects just-folded drains briefly with an empty outbox", () => {
    rememberFoldedPurchasedProtection(
      pending({ intent: "toggle-odd-bit", id: "ob1", purchased: "true" }),
    );

    const { merged, repairs } = mergeServerSnapshotWithLocal(
      "p1",
      snap({ oddBits: [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: false }] }),
      snap({ oddBits: [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: true }] }),
      { pendingOutbox: [] },
    );

    expect(merged.oddBits[0]?.purchased).toBe(true);
    expect(repairs).toEqual([
      expect.objectContaining({
        fields: { intent: "toggle-odd-bit", id: "ob1", purchased: "true" },
      }),
    ]);
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
