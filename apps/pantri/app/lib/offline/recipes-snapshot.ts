import { RECIPES_STORE, withStore } from "~/lib/offline/db";
import type { RecipeIngredient, RecipeStep } from "~/lib/recipe-schema";
import type { RecipeRecord } from "~/services/recipes.service";

export type SerializedRecipe = {
  id: string;
  pantryId: string;
  createdByUserId: string | null;
  name: string;
  description: string | null;
  link: string | null;
  servings: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecipesSnapshot = {
  pantryId: string;
  updatedAt: number;
  recipes: SerializedRecipe[];
};

function serializeRecipe(recipe: RecipeRecord): SerializedRecipe {
  return {
    id: recipe.id,
    pantryId: recipe.pantryId,
    createdByUserId: recipe.createdByUserId,
    name: recipe.name,
    description: recipe.description,
    link: recipe.link,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    shareToken: recipe.shareToken,
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
  };
}

export function deserializeRecipe(recipe: SerializedRecipe): RecipeRecord {
  return {
    ...recipe,
    createdAt: new Date(recipe.createdAt),
    updatedAt: new Date(recipe.updatedAt),
  };
}

export async function readRecipesSnapshot(pantryId: string): Promise<RecipesSnapshot | null> {
  try {
    return (
      (await withStore<RecipesSnapshot | undefined>(RECIPES_STORE, "readonly", (store) =>
        store.get(pantryId),
      )) ?? null
    );
  } catch {
    return null;
  }
}

export async function writeRecipesSnapshot(
  pantryId: string,
  recipes: RecipeRecord[],
): Promise<void> {
  const row: RecipesSnapshot = {
    pantryId,
    updatedAt: Date.now(),
    recipes: recipes.map(serializeRecipe),
  };
  await withStore(RECIPES_STORE, "readwrite", (store) => store.put(row));
}

/** Merge one recipe into the pantry list snapshot (e.g. after opening cook view). */
export async function upsertRecipeInSnapshot(recipe: RecipeRecord): Promise<void> {
  const previous = await readRecipesSnapshot(recipe.pantryId);
  const serialized = serializeRecipe(recipe);
  const recipes = previous?.recipes.filter((row) => row.id !== recipe.id) ?? [];
  recipes.push(serialized);
  recipes.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  await withStore(RECIPES_STORE, "readwrite", (store) =>
    store.put({
      pantryId: recipe.pantryId,
      updatedAt: Date.now(),
      recipes,
    }),
  );
}

export async function readRecipeFromSnapshot(
  pantryId: string,
  recipeId: string,
): Promise<RecipeRecord | null> {
  const snapshot = await readRecipesSnapshot(pantryId);
  const row = snapshot?.recipes.find((recipe) => recipe.id === recipeId);
  return row ? deserializeRecipe(row) : null;
}

export async function listRecipesFromSnapshot(pantryId: string): Promise<RecipeRecord[]> {
  const snapshot = await readRecipesSnapshot(pantryId);
  return (snapshot?.recipes ?? []).map(deserializeRecipe);
}
