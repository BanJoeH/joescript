import type { IngredientCategoryOverrides } from "~/lib/ingredient-sections";
import type { OddBit } from "~/lib/recipe-schema";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

export type SerializedShoppingRecipe = Omit<ShoppingRecipeRecord, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type ShoppingSnapshot = {
  pantryId: string;
  updatedAt: number;
  shoppingRecipes: SerializedShoppingRecipe[];
  oddBits: OddBit[];
  categoryOverrides: IngredientCategoryOverrides;
};

export type OutboxEntry = {
  id: string;
  pantryId: string;
  createdAt: number;
  actionPath: string;
  fields: Record<string, string>;
  status: "pending" | "failed";
  lastError?: string;
};

export function serializeShoppingRecipes(
  recipes: ShoppingRecipeRecord[],
): SerializedShoppingRecipe[] {
  return recipes.map((recipe) => ({
    ...recipe,
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
  }));
}

export function deserializeShoppingRecipes(
  recipes: SerializedShoppingRecipe[],
): ShoppingRecipeRecord[] {
  return recipes.map((recipe) => ({
    ...recipe,
    createdAt: new Date(recipe.createdAt),
    updatedAt: new Date(recipe.updatedAt),
  }));
}
