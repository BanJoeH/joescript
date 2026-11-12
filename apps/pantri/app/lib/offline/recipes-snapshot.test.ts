import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetShoppingOfflineDbForTests } from "~/lib/offline/db";
import {
  listRecipesFromSnapshot,
  readRecipeFromSnapshot,
  upsertRecipeInSnapshot,
  writeRecipesSnapshot,
} from "~/lib/offline/recipes-snapshot";
import type { RecipeRecord } from "~/services/recipes.service";

const pantryId = "p1";

function recipe(overrides: Partial<RecipeRecord> = {}): RecipeRecord {
  return {
    id: "r1",
    pantryId,
    createdByUserId: "u1",
    name: "Chili",
    description: null,
    link: null,
    servings: 4,
    ingredients: [{ name: "beef", amount: 1, unit: "lb" }],
    steps: [{ order: 0, text: "Cook" }],
    shareToken: null,
    createdAt: new Date("2020-01-01T00:00:00.000Z"),
    updatedAt: new Date("2020-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(async () => {
  await resetShoppingOfflineDbForTests();
});

afterEach(async () => {
  await resetShoppingOfflineDbForTests();
});

describe("recipes snapshot", () => {
  it("round-trips a recipe list", async () => {
    await writeRecipesSnapshot(pantryId, [recipe()]);
    const listed = await listRecipesFromSnapshot(pantryId);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ id: "r1", name: "Chili", servings: 4 });
    expect(listed[0]?.createdAt.toISOString()).toBe("2020-01-01T00:00:00.000Z");
  });

  it("upserts a detail recipe into an existing list", async () => {
    await writeRecipesSnapshot(pantryId, [recipe()]);
    await upsertRecipeInSnapshot(
      recipe({
        id: "r2",
        name: "Soup",
        ingredients: [{ name: "stock", amount: 1, unit: "cup" }],
      }),
    );
    expect((await listRecipesFromSnapshot(pantryId)).map((row) => row.id).sort()).toEqual([
      "r1",
      "r2",
    ]);
    expect(await readRecipeFromSnapshot(pantryId, "r2")).toMatchObject({ name: "Soup" });
  });
});
