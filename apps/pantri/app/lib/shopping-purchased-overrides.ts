import type { ShoppingIngredient } from "~/lib/recipe-schema";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

const ingredientOverrides = new Map<string, boolean>();
const oddBitOverrides = new Map<number, boolean>();

function ingredientKey(recipeId: string, index: number) {
  return `${recipeId}:${index}`;
}

export function setIngredientPurchasedOverride(
  recipeId: string,
  index: number,
  purchased: boolean,
) {
  ingredientOverrides.set(ingredientKey(recipeId, index), purchased);
}

export function setOddBitPurchasedOverride(index: number, purchased: boolean) {
  oddBitOverrides.set(index, purchased);
}

export function resetRecipePurchasedOverrides(recipe: ShoppingRecipeRecord) {
  recipe.ingredients.forEach((ingredient, index) => {
    if (ingredient.purchased) {
      ingredientOverrides.set(ingredientKey(recipe.id, index), false);
    }
  });
}

export function resetOddBitPurchasedOverrides(oddBits: ShoppingIngredient[]) {
  oddBits.forEach((bit, index) => {
    if (bit.purchased) {
      oddBitOverrides.set(index, false);
    }
  });
}

export function applyShoppingPurchasedOverrides(
  recipes: ShoppingRecipeRecord[],
  oddBits: ShoppingIngredient[],
): { recipes: ShoppingRecipeRecord[]; oddBits: ShoppingIngredient[] } {
  if (ingredientOverrides.size === 0 && oddBitOverrides.size === 0) {
    return { recipes, oddBits };
  }

  const nextRecipes =
    ingredientOverrides.size === 0
      ? recipes
      : recipes.map((recipe) => ({
          ...recipe,
          ingredients: recipe.ingredients.map((ingredient, index) => {
            const override = ingredientOverrides.get(ingredientKey(recipe.id, index));
            if (override === undefined) {
              return ingredient;
            }
            if (ingredient.purchased === override) {
              ingredientOverrides.delete(ingredientKey(recipe.id, index));
              return ingredient;
            }
            return { ...ingredient, purchased: override };
          }),
        }));

  const nextOddBits =
    oddBitOverrides.size === 0
      ? oddBits
      : oddBits.map((bit, index) => {
          const override = oddBitOverrides.get(index);
          if (override === undefined) {
            return bit;
          }
          if (bit.purchased === override) {
            oddBitOverrides.delete(index);
            return bit;
          }
          return { ...bit, purchased: override };
        });

  return { recipes: nextRecipes, oddBits: nextOddBits };
}

export function clearShoppingPurchasedOverrides() {
  ingredientOverrides.clear();
  oddBitOverrides.clear();
}
