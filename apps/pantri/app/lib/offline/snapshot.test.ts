import "fake-indexeddb/auto";
import Dexie from "dexie";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";

import { resetOfflineDbForTests } from "~/lib/offline/db";
import {
  getHomeSnapshot,
  getRecipeDetail,
  saveHomeSnapshot,
  saveRecipeDetail,
} from "~/lib/offline/snapshot";
import type { RecipeRecord } from "~/services/recipes.service";

function recipe(id: string): RecipeRecord {
  return {
    id,
    pantryId: "pantry-1",
    createdByUserId: null,
    name: `Recipe ${id}`,
    description: null,
    link: null,
    servings: 2,
    ingredients: [{ name: "salt", amount: 1, unit: "tsp" }],
    steps: [{ order: 1, text: "Mix" }],
    shareToken: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };
}

describe("offline snapshot", () => {
  beforeEach(async () => {
    resetOfflineDbForTests();
    await Dexie.delete("pantri-offline");
    globalThis.indexedDB = new IDBFactory();
  });

  it("saves and restores a home snapshot", async () => {
    await saveHomeSnapshot({
      pantryId: "pantry-1",
      shoppingRecipes: [],
      oddBits: [{ name: "milk", amount: 1, unit: "l", purchased: false }],
      recipes: [recipe("a")],
    });

    const loaded = await getHomeSnapshot("pantry-1");
    expect(loaded?.oddBits).toEqual([{ name: "milk", amount: 1, unit: "l", purchased: false }]);
    expect(loaded?.recipes[0]?.name).toBe("Recipe a");
    expect(loaded?.recipes[0]?.createdAt).toBeInstanceOf(Date);
    expect(loaded?.offline).toBe(true);
  });

  it("saves recipe detail and reads it back", async () => {
    const detail = recipe("cook-1");
    await saveRecipeDetail("pantry-1", detail);
    const loaded = await getRecipeDetail("pantry-1", "cook-1");
    expect(loaded?.recipe.name).toBe("Recipe cook-1");
    expect(loaded?.recipe.steps).toEqual([{ order: 1, text: "Mix" }]);
  });
});
