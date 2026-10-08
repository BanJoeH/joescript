import type { OddBit } from "~/lib/recipe-schema";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

const ingredientOverrides = new Map<string, boolean>();
const oddBitOverrides = new Map<string, boolean>();
const sortedPurchasedOverrides = new Map<string, boolean>();

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

export function setOddBitPurchasedOverride(id: string, purchased: boolean) {
  oddBitOverrides.set(id, purchased);
}

export function resetRecipePurchasedOverrides(recipe: ShoppingRecipeRecord) {
  recipe.ingredients.forEach((ingredient, index) => {
    if (ingredient.purchased) {
      ingredientOverrides.set(ingredientKey(recipe.id, index), false);
    }
  });
}

export function resetOddBitPurchasedOverrides(oddBits: OddBit[]) {
  for (const bit of oddBits) {
    if (bit.purchased) {
      oddBitOverrides.set(bit.id, false);
    }
  }
}

export function applyShoppingPurchasedOverrides(
  recipes: ShoppingRecipeRecord[],
  oddBits: OddBit[],
): { recipes: ShoppingRecipeRecord[]; oddBits: OddBit[] } {
  if (ingredientOverrides.size === 0 && oddBitOverrides.size === 0) {
    return { recipes, oddBits };
  }

  // Apply only — never delete from the Maps during render (that remapped the wrong
  // odd bit when a delayed revalidate landed).
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
            return { ...ingredient, purchased: override };
          }),
        }));

  const nextOddBits =
    oddBitOverrides.size === 0
      ? oddBits
      : oddBits.map((bit) => {
          const override = oddBitOverrides.get(bit.id);
          if (override === undefined) {
            return bit;
          }
          return { ...bit, purchased: override };
        });

  return { recipes: nextRecipes, oddBits: nextOddBits };
}

/** Drop overrides that already match loader data. Call from an effect, not render. */
export function reconcileShoppingPurchasedOverrides(
  recipes: ShoppingRecipeRecord[],
  oddBits: OddBit[],
) {
  for (const recipe of recipes) {
    recipe.ingredients.forEach((ingredient, index) => {
      const key = ingredientKey(recipe.id, index);
      const override = ingredientOverrides.get(key);
      if (override !== undefined && ingredient.purchased === override) {
        ingredientOverrides.delete(key);
      }
    });
  }
  for (const bit of oddBits) {
    const override = oddBitOverrides.get(bit.id);
    if (override !== undefined && bit.purchased === override) {
      oddBitOverrides.delete(bit.id);
    }
  }
}

export function clearShoppingPurchasedOverrides() {
  ingredientOverrides.clear();
  oddBitOverrides.clear();
  sortedPurchasedOverrides.clear();
}

export function setSortedPurchasedOverride(canonicalName: string, purchased: boolean) {
  sortedPurchasedOverrides.set(canonicalName, purchased);
}

export function resetSortedPurchasedOverrides(canonicalNames: string[]) {
  for (const canonicalName of canonicalNames) {
    sortedPurchasedOverrides.set(canonicalName, false);
  }
}

export function applySortedPurchasedOverrides<
  T extends { canonicalName: string; purchased: boolean },
>(items: T[]): T[] {
  if (sortedPurchasedOverrides.size === 0) {
    return items;
  }

  return items.map((item) => {
    const override = sortedPurchasedOverrides.get(item.canonicalName);
    if (override === undefined) {
      return item;
    }
    return { ...item, purchased: override };
  });
}

export function reconcileSortedPurchasedOverrides<
  T extends { canonicalName: string; purchased: boolean },
>(items: T[]) {
  for (const item of items) {
    const override = sortedPurchasedOverrides.get(item.canonicalName);
    if (override !== undefined && item.purchased === override) {
      sortedPurchasedOverrides.delete(item.canonicalName);
    }
  }
}
