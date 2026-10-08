import type { SerializedRecipe, SerializedShoppingRecipe } from "~/lib/offline/db";
import type { RecipeRecord } from "~/services/recipes.service";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

export function serializeRecipe(recipe: RecipeRecord): SerializedRecipe {
  return {
    ...recipe,
    createdAt: toIso(recipe.createdAt),
    updatedAt: toIso(recipe.updatedAt),
  };
}

export function deserializeRecipe(recipe: SerializedRecipe): RecipeRecord {
  return {
    ...recipe,
    createdAt: new Date(recipe.createdAt),
    updatedAt: new Date(recipe.updatedAt),
  };
}

export function serializeShoppingRecipe(recipe: ShoppingRecipeRecord): SerializedShoppingRecipe {
  return {
    ...recipe,
    createdAt: toIso(recipe.createdAt),
    updatedAt: toIso(recipe.updatedAt),
  };
}

export function deserializeShoppingRecipe(recipe: SerializedShoppingRecipe): ShoppingRecipeRecord {
  return {
    ...recipe,
    createdAt: new Date(recipe.createdAt),
    updatedAt: new Date(recipe.updatedAt),
  };
}
