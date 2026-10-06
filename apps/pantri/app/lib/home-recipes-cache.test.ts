import { describe, expect, it } from "vitest";

import { clearHomeRecipesCache, resolveHomeRecipes } from "~/lib/home-recipes-cache";
import type { RecipeRecord } from "~/services/recipes.service";

function recipe(id: string): RecipeRecord {
  return {
    id,
    name: `Recipe ${id}`,
    pantryId: "pantry-1",
    createdByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    servings: null,
    description: null,
    link: null,
    ingredients: [],
    steps: [],
    shareToken: null,
  };
}

describe("resolveHomeRecipes", () => {
  it("returns loader recipes and caches them for the pantry", () => {
    clearHomeRecipesCache();
    const loaded = [recipe("a")];
    expect(resolveHomeRecipes("pantry-1", loaded)).toEqual(loaded);
    expect(resolveHomeRecipes("pantry-1", [])).toEqual(loaded);
  });

  it("returns empty when loader and cache are both empty", () => {
    clearHomeRecipesCache("pantry-2");
    expect(resolveHomeRecipes("pantry-2", [])).toEqual([]);
  });
});
