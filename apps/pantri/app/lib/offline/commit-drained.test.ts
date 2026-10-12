import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyOutboxToSnapshot } from "~/lib/offline/apply-outbox";
import { commitDrainedOutboxEntry } from "~/lib/offline/commit-drained";
import { resetShoppingOfflineDbForTests } from "~/lib/offline/db";
import { enqueueOutbox, listOutbox } from "~/lib/offline/outbox";
import { readShoppingSnapshot, writeShoppingSnapshot } from "~/lib/offline/snapshot";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

const pantryId = "pantry-commit";

const recipes: ShoppingRecipeRecord[] = [
  {
    id: "r1",
    pantryId,
    sourceRecipeId: null,
    name: "Chili",
    link: null,
    servings: null,
    createdAt: new Date("2020-01-01T00:00:00.000Z"),
    updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    ingredients: [{ id: "i1", name: "beef", amount: 1, unit: "lb", purchased: false }],
  },
];

beforeEach(async () => {
  await resetShoppingOfflineDbForTests();
});

afterEach(async () => {
  await resetShoppingOfflineDbForTests();
});

describe("commitDrainedOutboxEntry", () => {
  it("folds the entry into snapshot base before removing it from the outbox", async () => {
    await writeShoppingSnapshot(pantryId, {
      shoppingRecipes: recipes,
      oddBits: [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: false }],
    });
    const entry = await enqueueOutbox({
      pantryId,
      actionPath: `/${pantryId}/shopping`,
      fields: { intent: "toggle-odd-bit", id: "ob1", purchased: "true" },
    });

    await commitDrainedOutboxEntry(entry);

    expect(await listOutbox(pantryId)).toEqual([]);
    const base = await readShoppingSnapshot(pantryId);
    expect(base?.oddBits[0]?.purchased).toBe(true);

    // Applied view stays correct with an empty outbox (no revert flicker).
    expect(applyOutboxToSnapshot(base!, []).oddBits[0]?.purchased).toBe(true);
  });

  it("keeps remaining outbox rows on top of the folded base", async () => {
    const clientId = "55555555-5555-4555-8555-555555555555";
    await writeShoppingSnapshot(pantryId, {
      shoppingRecipes: recipes,
      oddBits: [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: false }],
    });
    const first = await enqueueOutbox({
      pantryId,
      actionPath: `/${pantryId}/shopping`,
      fields: { intent: "toggle-odd-bit", id: "ob1", purchased: "true" },
    });
    await enqueueOutbox({
      pantryId,
      actionPath: `/${pantryId}/shopping`,
      fields: { intent: "add-odd-bit", id: clientId, name: "bags" },
    });

    await commitDrainedOutboxEntry(first);

    const base = await readShoppingSnapshot(pantryId);
    const outbox = await listOutbox(pantryId);
    expect(base?.oddBits[0]?.purchased).toBe(true);
    expect(outbox).toHaveLength(1);
    expect(applyOutboxToSnapshot(base!, outbox).oddBits.map((bit) => bit.id)).toEqual([
      "ob1",
      clientId,
    ]);
  });
});
