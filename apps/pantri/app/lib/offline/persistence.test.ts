import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyOutboxToSnapshot } from "~/lib/offline/apply-outbox";
import { resetShoppingOfflineDbForTests } from "~/lib/offline/db";
import { decideOutboxDrainStep } from "~/lib/offline/drain-decision";
import { loadOfflineShoppingSnapshot } from "~/lib/offline/hydrate-shopping";
import {
  enqueueOutbox,
  listOutbox,
  markOutboxFailed,
  peekOutbox,
  removeOutboxEntry,
} from "~/lib/offline/outbox";
import { readShoppingSnapshot, writeShoppingSnapshot } from "~/lib/offline/snapshot";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

const pantryId = "pantry-test";

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

describe("shopping offline persistence", () => {
  it("round-trips a snapshot through IndexedDB", async () => {
    await writeShoppingSnapshot(pantryId, {
      shoppingRecipes: recipes,
      oddBits: [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: false }],
      categoryOverrides: { onion: "Produce" },
    });

    const stored = await readShoppingSnapshot(pantryId);
    expect(stored?.pantryId).toBe(pantryId);
    expect(stored?.shoppingRecipes[0]?.ingredients[0]?.name).toBe("beef");
    expect(stored?.categoryOverrides.onion).toBe("Produce");
  });

  it("enqueues, peeks FIFO, removes, and marks failed", async () => {
    const first = await enqueueOutbox({
      pantryId,
      actionPath: `/${pantryId}/shopping`,
      fields: { intent: "toggle-odd-bit", id: "ob1", purchased: "true" },
    });
    const second = await enqueueOutbox({
      pantryId,
      actionPath: `/${pantryId}/shopping`,
      fields: { intent: "remove-odd-bit", id: "ob2" },
    });

    expect((await peekOutbox(pantryId))?.id).toBe(first.id);
    expect((await listOutbox(pantryId)).map((entry) => entry.id)).toEqual([first.id, second.id]);

    await removeOutboxEntry(first.id);
    expect((await peekOutbox(pantryId))?.id).toBe(second.id);

    await markOutboxFailed(second.id, "Nope");
    expect(await peekOutbox(pantryId)).toBeNull();
    const failed = (await listOutbox(pantryId))[0];
    expect(failed).toMatchObject({ id: second.id, status: "failed", lastError: "Nope" });
  });

  it("hydrates by applying pending outbox onto the last snapshot", async () => {
    await writeShoppingSnapshot(pantryId, {
      shoppingRecipes: recipes,
      oddBits: [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: false }],
    });
    await enqueueOutbox({
      pantryId,
      actionPath: `/${pantryId}/shopping`,
      fields: {
        intent: "toggle-ingredient",
        shoppingRecipeId: "r1",
        ingredientId: "i1",
        purchased: "true",
      },
    });
    await enqueueOutbox({
      pantryId,
      actionPath: `/${pantryId}/shopping`,
      fields: {
        intent: "add-odd-bit",
        clientPendingId: "pending:1",
        name: "bags",
      },
    });

    const hydrated = await loadOfflineShoppingSnapshot(pantryId);
    expect(hydrated?.applied.shoppingRecipes[0]?.ingredients[0]?.purchased).toBe(true);
    expect(hydrated?.applied.oddBits.map((bit) => bit.id)).toEqual(["ob1", "pending:1"]);
    // Raw snapshot stays server-truth until the next online loader write.
    expect(hydrated?.snapshot.shoppingRecipes[0]?.ingredients[0]?.purchased).toBe(false);
  });

  it("drain decision against a real queue does not drop failed entries", async () => {
    await writeShoppingSnapshot(pantryId, {
      shoppingRecipes: recipes,
      oddBits: [{ id: "ob1", name: "foil", amount: null, unit: null, purchased: false }],
    });
    const a = await enqueueOutbox({
      pantryId,
      actionPath: `/${pantryId}/shopping`,
      fields: { intent: "toggle-odd-bit", id: "ob1", purchased: "true" },
    });
    const b = await enqueueOutbox({
      pantryId,
      actionPath: `/${pantryId}/shopping`,
      fields: { intent: "add-odd-bit", clientPendingId: "pending:1", name: "bags" },
    });

    const remaining = (await listOutbox(pantryId)).filter(
      (entry) => entry.status === "pending" && entry.id !== a.id,
    );
    const decision = decideOutboxDrainStep({ error: "Server said no" }, a.id, remaining[0] ?? null);
    expect(decision).toMatchObject({
      remove: false,
      failReason: "Server said no",
      next: { id: b.id },
      shouldRevalidate: false,
    });

    if (decision.remove) {
      await removeOutboxEntry(decision.entryId);
    } else {
      await markOutboxFailed(decision.entryId, decision.failReason ?? "failed");
    }

    const after = await listOutbox(pantryId);
    expect(after.find((entry) => entry.id === a.id)?.status).toBe("failed");
    expect(after.find((entry) => entry.id === b.id)?.status).toBe("pending");

    const snap = await readShoppingSnapshot(pantryId);
    if (!snap) throw new Error("expected snapshot");
    const applied = applyOutboxToSnapshot(snap, after);
    // Failed toggle is skipped; pending add still applies.
    expect(applied.shoppingRecipes[0]?.ingredients[0]?.purchased).toBe(false);
    expect(applied.oddBits.map((bit) => bit.id)).toEqual(["ob1", "pending:1"]);
  });
});
