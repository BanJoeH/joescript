import type { RecipeRecord } from "~/services/recipes.service";

const recipesByPantry = new Map<string, RecipeRecord[]>();

/** Keep the recipes tab stable while the shopping route skips loading recipes. */
export function resolveHomeRecipes(
  pantryId: string,
  loaderRecipes: RecipeRecord[],
): RecipeRecord[] {
  if (loaderRecipes.length > 0) {
    recipesByPantry.set(pantryId, loaderRecipes);
    return loaderRecipes;
  }

  return recipesByPantry.get(pantryId) ?? [];
}

export function clearHomeRecipesCache(pantryId?: string) {
  if (pantryId) {
    recipesByPantry.delete(pantryId);
    return;
  }

  recipesByPantry.clear();
}
