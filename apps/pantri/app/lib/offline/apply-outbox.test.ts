import { describe, expect, it } from "vitest";

import { applyOutboxToSnapshot } from "~/lib/offline/apply-outbox";
import { interpretActionData } from "~/lib/offline/interpret-action-data";
import { oddBitsFromOutbox } from "~/lib/offline/odd-bits-from-outbox";
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
    ],
    oddBits: [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: false }],
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
        clientPendingId: "pending:1",
        name: "bags",
        amount: "2",
        unit: "rolls",
      }),
    ]);

    expect(next.shoppingRecipes[0]?.ingredients[0]?.purchased).toBe(true);
    expect(next.oddBits.map((bit) => bit.id)).toEqual(["pending:1"]);
    expect(next.oddBits[0]).toMatchObject({ name: "bags", amount: 2, unit: "rolls" });
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
    expect(next.shoppingRecipes).toHaveLength(1);
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

describe("oddBitsFromOutbox", () => {
  it("returns pending adds not already on the server", () => {
    const bits = oddBitsFromOutbox(
      [
        entry({
          intent: "add-odd-bit",
          clientPendingId: "pending:1",
          name: "bags",
        }),
        entry({
          intent: "add-odd-bit",
          clientPendingId: "ob1",
          name: "foil",
        }),
      ],
      [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: false }],
    );
    expect(bits.map((bit) => bit.id)).toEqual(["pending:1"]);
  });
});
