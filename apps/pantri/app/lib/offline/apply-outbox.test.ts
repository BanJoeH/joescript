import { describe, expect, it } from "vitest";

import { applyOutboxToSnapshot } from "~/lib/offline/apply-outbox";
import {
  shoppingBusyFromOutbox,
  sortedBusyFromOutbox,
  unionShoppingBusy,
  unionSortedBusy,
} from "~/lib/offline/busy-from-outbox";
import { decideOutboxDrainStep } from "~/lib/offline/drain-decision";
import {
  interpretActionData,
  interpretFetchResponseMeta,
} from "~/lib/offline/interpret-action-data";
import { oddBitsFromOutbox } from "~/lib/offline/odd-bits-from-outbox";
import { submitShoppingMutation } from "~/lib/offline/submit-shopping-mutation";
import type { OutboxEntry, ShoppingSnapshot } from "~/lib/offline/types";

function snapshot(overrides: Partial<ShoppingSnapshot> = {}): ShoppingSnapshot {
  return {
    pantryId: "p1",
    updatedAt: 1,
    shoppingRecipes: [
      {
        id: "r1",
        pantryId: "p1",
        sourceRecipeId: null,
        name: "Chili",
        link: null,
        servings: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        ingredients: [
          { id: "i1", name: "beef", amount: 1, unit: "lb", purchased: false },
          { id: "i2", name: "onion", amount: 1, unit: null, purchased: true },
        ],
      },
      {
        id: "r2",
        pantryId: "p1",
        sourceRecipeId: null,
        name: "Soup",
        link: null,
        servings: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        ingredients: [{ id: "i3", name: "stock", amount: 1, unit: "cup", purchased: true }],
      },
    ],
    oddBits: [
      { id: "ob1", name: "foil", amount: null, unit: null, purchased: true },
      { id: "ob2", name: "bags", amount: null, unit: null, purchased: false },
    ],
    categoryOverrides: {},
    ...overrides,
  };
}

function entry(fields: Record<string, string>, overrides: Partial<OutboxEntry> = {}): OutboxEntry {
  return {
    id: overrides.id ?? "e1",
    pantryId: "p1",
    createdAt: overrides.createdAt ?? 1,
    actionPath: overrides.actionPath ?? "/p1/shopping",
    fields,
    status: overrides.status ?? "pending",
    lastError: overrides.lastError,
  };
}

describe("applyOutboxToSnapshot", () => {
  it("applies toggle, remove, and add intents in order", () => {
    const next = applyOutboxToSnapshot(snapshot(), [
      entry({
        intent: "toggle-ingredient",
        shoppingRecipeId: "r1",
        ingredientId: "i1",
        purchased: "true",
      }),
      entry({ intent: "remove-odd-bit", id: "ob1" }),
      entry({
        intent: "add-odd-bit",
        id: "11111111-1111-4111-8111-111111111111",
        name: "tape",
        amount: "2",
        unit: "rolls",
      }),
    ]);

    expect(next.shoppingRecipes[0]?.ingredients[0]?.purchased).toBe(true);
    expect(next.oddBits.map((bit) => bit.id)).toEqual([
      "ob2",
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(next.oddBits[1]).toMatchObject({ name: "tape", amount: 2, unit: "rolls" });
  });

  it("removes a shopping recipe", () => {
    const next = applyOutboxToSnapshot(snapshot(), [
      entry({ intent: "remove-recipe", shoppingRecipeId: "r1" }),
    ]);
    expect(next.shoppingRecipes.map((recipe) => recipe.id)).toEqual(["r2"]);
  });

  it("clears purchased flags on a recipe and on odd bits", () => {
    const next = applyOutboxToSnapshot(snapshot(), [
      entry({ intent: "clear-recipe-purchased", shoppingRecipeId: "r1" }),
      entry({ intent: "clear-odd-bits-purchased" }, { id: "e2", createdAt: 2 }),
    ]);
    expect(next.shoppingRecipes[0]?.ingredients.every((ingredient) => !ingredient.purchased)).toBe(
      true,
    );
    expect(next.oddBits.every((bit) => !bit.purchased)).toBe(true);
  });

  it("clears all purchased across recipes and odd bits", () => {
    const next = applyOutboxToSnapshot(snapshot(), [
      entry({ intent: "clear-all-purchased" }, { actionPath: "/p1/shopping/sorted" }),
    ]);
    expect(
      next.shoppingRecipes
        .flatMap((recipe) => recipe.ingredients)
        .every((ingredient) => !ingredient.purchased),
    ).toBe(true);
    expect(next.oddBits.every((bit) => !bit.purchased)).toBe(true);
  });

  it("applies sorted name toggle and category override", () => {
    const next = applyOutboxToSnapshot(snapshot(), [
      entry(
        { intent: "toggle", name: "onion", purchased: "false" },
        { actionPath: "/p1/shopping/sorted" },
      ),
      entry(
        { intent: "set-category", name: "onion", section: "Pantry" },
        { actionPath: "/p1/shopping/sorted", id: "e2", createdAt: 2 },
      ),
    ]);

    expect(next.shoppingRecipes[0]?.ingredients[1]?.purchased).toBe(false);
    expect(next.categoryOverrides.onion).toBe("Pantry");
  });

  it("skips failed outbox rows", () => {
    const next = applyOutboxToSnapshot(snapshot(), [
      entry(
        { intent: "remove-recipe", shoppingRecipeId: "r1" },
        { status: "failed", lastError: "Nope" },
      ),
    ]);
    expect(next.shoppingRecipes).toHaveLength(2);
  });

  it("does not duplicate an add that is already present", () => {
    const next = applyOutboxToSnapshot(snapshot(), [
      entry({
        intent: "add-odd-bit",
        id: "ob2",
        name: "bags",
      }),
    ]);
    expect(next.oddBits.filter((bit) => bit.id === "ob2")).toHaveLength(1);
  });

  it("applies add then toggle with the same client id", () => {
    const id = "22222222-2222-4222-8222-222222222222";
    const next = applyOutboxToSnapshot(snapshot(), [
      entry({ intent: "add-odd-bit", id, name: "bags" }),
      entry({ intent: "toggle-odd-bit", id, purchased: "true" }, { id: "e2", createdAt: 2 }),
    ]);
    expect(next.oddBits.find((bit) => bit.id === id)).toMatchObject({
      name: "bags",
      purchased: true,
    });
  });
});

describe("busy from outbox", () => {
  it("maps pending shopping intents into busy sets", () => {
    const busy = shoppingBusyFromOutbox([
      entry({
        intent: "toggle-ingredient",
        shoppingRecipeId: "r1",
        ingredientId: "i1",
        purchased: "true",
      }),
      entry({ intent: "remove-recipe", shoppingRecipeId: "r2" }, { id: "e2", createdAt: 2 }),
      entry({ intent: "clear-odd-bits-purchased" }, { id: "e3", createdAt: 3 }),
      entry({ intent: "remove-odd-bit", id: "ob1" }, { id: "e4", createdAt: 4, status: "failed" }),
    ]);

    expect([...busy.ingredientKeys]).toEqual(["r1:i1"]);
    expect([...busy.recipeRemoves]).toEqual(["r2"]);
    expect(busy.oddBitClears).toBe(true);
    expect([...busy.oddBitRemoves]).toEqual([]);
  });

  it("maps pending sorted intents into busy sets", () => {
    const busy = sortedBusyFromOutbox([
      entry({ intent: "toggle", name: "Onions", purchased: "true" }),
      entry({ intent: "set-category", name: "beef", section: "Meat" }, { id: "e2", createdAt: 2 }),
      entry({ intent: "clear-all-purchased" }, { id: "e3", createdAt: 3 }),
    ]);

    expect([...busy.toggles]).toEqual(["onion"]);
    expect([...busy.moves]).toEqual(["beef"]);
    expect(busy.clearAll).toBe(true);
  });

  it("unions busy sets", () => {
    const shopping = unionShoppingBusy(
      shoppingBusyFromOutbox([entry({ intent: "toggle-odd-bit", id: "ob1", purchased: "true" })]),
      shoppingBusyFromOutbox([entry({ intent: "remove-odd-bit", id: "ob2" }, { id: "e2" })]),
    );
    expect([...shopping.oddBitIds]).toEqual(["ob1"]);
    expect([...shopping.oddBitRemoves]).toEqual(["ob2"]);

    const sorted = unionSortedBusy(
      sortedBusyFromOutbox([entry({ intent: "toggle", name: "salt", purchased: "true" })]),
      sortedBusyFromOutbox([entry({ intent: "clear-all-purchased" }, { id: "e2" })]),
    );
    expect([...sorted.toggles]).toEqual(["salt"]);
    expect(sorted.clearAll).toBe(true);
  });
});

describe("interpretActionData", () => {
  it("accepts only explicit ok:true without error", () => {
    expect(interpretActionData({ ok: true })).toEqual({ ok: true, data: { ok: true } });
    expect(interpretActionData({ ok: true, oddBit: { id: "x" } }).ok).toBe(true);
  });

  it("rejects error payloads and non-ok shapes", () => {
    expect(interpretActionData({ error: "Nope" })).toEqual({ ok: false, reason: "Nope" });
    expect(interpretActionData({ ok: true, error: "Nope" })).toEqual({
      ok: false,
      reason: "Nope",
    });
    expect(interpretActionData({ success: true }).ok).toBe(false);
    expect(interpretActionData(null).ok).toBe(false);
    expect(interpretActionData("<html></html>").ok).toBe(false);
  });
});

describe("interpretFetchResponseMeta", () => {
  it("rejects auth failures and login redirects", () => {
    expect(interpretFetchResponseMeta(new Response(null, { status: 401 }))).toEqual({
      ok: false,
      reason: "Not authenticated.",
    });
    const redirected = {
      status: 200,
      redirected: true,
      url: "https://example.com/login",
      type: "basic",
    } as Response;
    expect(interpretFetchResponseMeta(redirected)).toEqual({
      ok: false,
      reason: "Redirected to login.",
    });
  });

  it("returns null when the body should be inspected", () => {
    expect(interpretFetchResponseMeta(new Response("{}", { status: 200 }))).toBeNull();
  });
});

describe("decideOutboxDrainStep", () => {
  const next = entry({ intent: "toggle-odd-bit", id: "ob2", purchased: "true" }, { id: "e2" });

  it("removes on ok:true and continues to the next pending entry", () => {
    expect(decideOutboxDrainStep({ ok: true }, "e1", next)).toEqual({
      entryId: "e1",
      remove: true,
      next,
      shouldRevalidate: false,
    });
  });

  it("marks failure on { error } and does not treat it as success", () => {
    expect(decideOutboxDrainStep({ error: "Nope" }, "e1", next)).toEqual({
      entryId: "e1",
      remove: false,
      failReason: "Nope",
      next,
      shouldRevalidate: false,
    });
  });

  it("treats remove not-found as converged success (still folds)", () => {
    expect(
      decideOutboxDrainStep({ error: "Odd bit not found" }, "e1", next, "remove-odd-bit"),
    ).toEqual({
      entryId: "e1",
      remove: true,
      skipFold: false,
      next,
      shouldRevalidate: false,
    });
  });

  it("treats toggle not-found as converged success without folding", () => {
    expect(
      decideOutboxDrainStep({ error: "Ingredient not found" }, "e1", null, "toggle-ingredient"),
    ).toEqual({
      entryId: "e1",
      remove: true,
      skipFold: true,
      next: null,
      shouldRevalidate: true,
    });
  });

  it("revalidates only when the queue is empty after the step", () => {
    expect(decideOutboxDrainStep({ ok: true }, "e1", null).shouldRevalidate).toBe(true);
    expect(decideOutboxDrainStep({ error: "Nope" }, "e1", null).shouldRevalidate).toBe(true);
  });
});

describe("oddBitsFromOutbox", () => {
  it("returns pending adds not already on the server", () => {
    const bits = oddBitsFromOutbox(
      [
        entry({
          intent: "add-odd-bit",
          id: "11111111-1111-4111-8111-111111111111",
          name: "bags",
        }),
        entry({
          intent: "add-odd-bit",
          id: "ob1",
          name: "foil",
        }),
      ],
      [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: false }],
    );
    expect(bits.map((bit) => bit.id)).toEqual(["11111111-1111-4111-8111-111111111111"]);
  });
});

describe("submitShoppingMutation", () => {
  it("always enqueues (local-first)", async () => {
    const enqueued: unknown[] = [];
    const fields = { intent: "toggle-odd-bit", id: "ob1", purchased: "true" };
    const result = await submitShoppingMutation({
      pantryId: "p1",
      action: "/p1/shopping",
      fields,
      enqueue: async (input) => {
        enqueued.push(input);
        return entry(input.fields);
      },
    });
    expect(result).toBe("queued");
    expect(enqueued).toEqual([{ pantryId: "p1", actionPath: "/p1/shopping", fields }]);
  });
});
