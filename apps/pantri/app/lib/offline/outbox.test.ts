import "fake-indexeddb/auto";
import Dexie from "dexie";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyShoppingFormToSnapshot } from "~/lib/offline/apply-mutation";
import { type PantrySnapshotRow, resetOfflineDbForTests } from "~/lib/offline/db";
import {
  applyPendingOutboxToHomeSnapshot,
  drainOutbox,
  enqueueOutbox,
  interpretOutboxResponse,
  isSuccessfulOutboxResponse,
  listOutbox,
} from "~/lib/offline/outbox";
import { saveHomeSnapshot } from "~/lib/offline/snapshot";

function baseSnapshot(): PantrySnapshotRow {
  return {
    pantryId: "pantry-1",
    revision: null,
    fetchedAt: new Date().toISOString(),
    shoppingRecipes: [
      {
        id: "shop-1",
        pantryId: "pantry-1",
        sourceRecipeId: "r1",
        name: "Pasta",
        link: null,
        servings: 2,
        ingredients: [
          { name: "pasta", amount: 400, unit: "g", purchased: false },
          { name: "salt", amount: 1, unit: "tsp", purchased: false },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    oddBits: [],
    recipes: [],
  };
}

describe("applyShoppingFormToSnapshot", () => {
  it("toggles an ingredient purchased flag", () => {
    const next = applyShoppingFormToSnapshot(baseSnapshot(), [
      ["intent", "toggle-ingredient"],
      ["shoppingRecipeId", "shop-1"],
      ["ingredientIndex", "0"],
      ["purchased", "true"],
    ]);
    expect(next.shoppingRecipes[0]?.ingredients[0]?.purchased).toBe(true);
    expect(next.shoppingRecipes[0]?.ingredients[1]?.purchased).toBe(false);
  });

  it("applies set-category to local overrides", () => {
    const next = applyShoppingFormToSnapshot(baseSnapshot(), [
      ["intent", "set-category"],
      ["name", "red onions"],
      ["section", "Produce"],
    ]);
    expect(next.categoryOverrides?.["red onion"]).toBe("Produce");
  });

  it("toggles sorted names with canonical matching", () => {
    const shoppingRecipe = baseSnapshot().shoppingRecipes[0];
    expect(shoppingRecipe).toBeDefined();
    if (!shoppingRecipe) return;

    const next = applyShoppingFormToSnapshot(
      {
        ...baseSnapshot(),
        shoppingRecipes: [
          {
            ...shoppingRecipe,
            ingredients: [{ name: "onions", amount: 2, unit: null, purchased: false }],
          },
        ],
      },
      [
        ["intent", "toggle"],
        ["name", "onion"],
        ["purchased", "true"],
      ],
    );
    expect(next.shoppingRecipes[0]?.ingredients[0]?.purchased).toBe(true);
  });
});

describe("outbox", () => {
  beforeEach(async () => {
    resetOfflineDbForTests();
    await Dexie.delete("pantri-offline");
    globalThis.indexedDB = new IDBFactory();
    await saveHomeSnapshot({
      pantryId: "pantry-1",
      shoppingRecipes: baseSnapshot().shoppingRecipes.map((recipe) => ({
        ...recipe,
        createdAt: new Date(recipe.createdAt),
        updatedAt: new Date(recipe.updatedAt),
      })),
      oddBits: [],
      recipes: [],
    });
    vi.stubGlobal("navigator", { onLine: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("queues a shopping toggle and applies it locally", async () => {
    const formData = new FormData();
    formData.set("intent", "toggle-ingredient");
    formData.set("shoppingRecipeId", "shop-1");
    formData.set("ingredientIndex", "1");
    formData.set("purchased", "true");

    await enqueueOutbox({
      pantryId: "pantry-1",
      actionUrl: "/pantry-1/shopping",
      formData,
    });

    const pending = await listOutbox("pantry-1");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.formEntries).toContainEqual(["intent", "toggle-ingredient"]);
  });

  it("drains queued actions when online", async () => {
    const formData = new FormData();
    formData.set("intent", "toggle-ingredient");
    formData.set("shoppingRecipeId", "shop-1");
    formData.set("ingredientIndex", "0");
    formData.set("purchased", "true");

    await enqueueOutbox({
      pantryId: "pantry-1",
      actionUrl: "/pantry-1/shopping",
      formData,
    });

    vi.stubGlobal("navigator", { onLine: true });
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await drainOutbox({ pantryId: "pantry-1" });
    expect(result.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(await listOutbox("pantry-1")).toHaveLength(0);
  });

  it("keeps outbox entries when drain hits a login redirect", async () => {
    const formData = new FormData();
    formData.set("intent", "toggle-ingredient");
    formData.set("shoppingRecipeId", "shop-1");
    formData.set("ingredientIndex", "0");
    formData.set("purchased", "true");

    await enqueueOutbox({
      pantryId: "pantry-1",
      actionUrl: "/pantry-1/shopping",
      formData,
    });

    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(null, {
            status: 302,
            headers: { Location: "/login" },
          }),
      ),
    );

    const result = await drainOutbox({ pantryId: "pantry-1" });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    const pending = await listOutbox("pantry-1");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.lastError).toContain("/login");
  });

  it("replays pending outbox onto a fresh server snapshot", async () => {
    const formData = new FormData();
    formData.set("intent", "toggle-ingredient");
    formData.set("shoppingRecipeId", "shop-1");
    formData.set("ingredientIndex", "0");
    formData.set("purchased", "true");

    await enqueueOutbox({
      pantryId: "pantry-1",
      actionUrl: "/pantry-1/shopping",
      formData,
    });

    // Simulate online refresh overwriting local optimism with clean server data.
    await saveHomeSnapshot({
      pantryId: "pantry-1",
      shoppingRecipes: baseSnapshot().shoppingRecipes.map((recipe) => ({
        ...recipe,
        createdAt: new Date(recipe.createdAt),
        updatedAt: new Date(recipe.updatedAt),
        ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient, purchased: false })),
      })),
      oddBits: [],
      recipes: [],
    });

    const merged = await applyPendingOutboxToHomeSnapshot("pantry-1");
    expect(merged?.shoppingRecipes[0]?.ingredients[0]?.purchased).toBe(true);
    expect(await listOutbox("pantry-1")).toHaveLength(1);
  });

  it("assigns a shoppingRecipeId when queueing add-to-shopping", async () => {
    await saveHomeSnapshot({
      pantryId: "pantry-1",
      shoppingRecipes: [],
      oddBits: [],
      recipes: [
        {
          id: "r1",
          pantryId: "pantry-1",
          createdByUserId: null,
          name: "Pasta",
          description: null,
          link: null,
          servings: 2,
          ingredients: [{ name: "pasta", amount: 400, unit: "g" }],
          steps: [],
          shareToken: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const formData = new FormData();
    formData.set("intent", "add-to-shopping");
    formData.set("recipeId", "r1");

    await enqueueOutbox({
      pantryId: "pantry-1",
      actionUrl: "/pantry-1/recipes/r1",
      formData,
    });

    const pending = await listOutbox("pantry-1");
    const idEntry = pending[0]?.formEntries.find(([key]) => key === "shoppingRecipeId");
    expect(idEntry?.[1]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe("isSuccessfulOutboxResponse", () => {
  it("accepts 2xx and app redirects, rejects login redirects", () => {
    expect(isSuccessfulOutboxResponse(new Response(null, { status: 200 }))).toBe(true);
    expect(
      isSuccessfulOutboxResponse(
        new Response(null, { status: 302, headers: { Location: "/p1/recipes" } }),
      ),
    ).toBe(true);
    expect(
      isSuccessfulOutboxResponse(
        new Response(null, { status: 302, headers: { Location: "/login?next=%2F" } }),
      ),
    ).toBe(false);
    expect(
      isSuccessfulOutboxResponse(new Response(null, { status: 302, headers: { Location: "" } })),
    ).toBe(false);
  });
});

describe("interpretOutboxResponse", () => {
  it("rejects JSON action errors even when status is 200", async () => {
    const response = new Response(JSON.stringify({ error: "Shopping recipe not found" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    await expect(interpretOutboxResponse(response)).resolves.toEqual({
      ok: false,
      error: "Shopping recipe not found",
    });
  });

  it("accepts JSON success payloads", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    await expect(interpretOutboxResponse(response)).resolves.toEqual({ ok: true });
  });
});
