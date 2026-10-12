import { getCanonicalIngredientName } from "~/lib/ingredient-name";
import type { ShoppingSection } from "~/lib/ingredient-sections";
import type { OutboxEntry, ShoppingSnapshot } from "~/lib/offline/types";
import type { OddBit, ShoppingIngredient } from "~/lib/recipe-schema";

function parseAmount(raw: string | undefined) {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function setIngredientPurchased(
  ingredients: ShoppingIngredient[],
  ingredientId: string,
  purchased: boolean,
) {
  return ingredients.map((ingredient) =>
    ingredient.id === ingredientId ? { ...ingredient, purchased } : ingredient,
  );
}

function setPurchasedByName(ingredients: ShoppingIngredient[], name: string, purchased: boolean) {
  return ingredients.map((ingredient) =>
    getCanonicalIngredientName(ingredient.name) === getCanonicalIngredientName(name)
      ? { ...ingredient, purchased }
      : ingredient,
  );
}

/** Apply FIFO outbox intents onto a snapshot for offline display / hydrate. */
export function applyOutboxToSnapshot(
  snapshot: ShoppingSnapshot,
  entries: OutboxEntry[],
): ShoppingSnapshot {
  let shoppingRecipes = snapshot.shoppingRecipes.map((recipe) => ({
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
  }));
  let oddBits = snapshot.oddBits.map((bit) => ({ ...bit }));
  let categoryOverrides = { ...snapshot.categoryOverrides };

  for (const entry of entries) {
    if (entry.status === "failed") continue;
    const intent = entry.fields.intent ?? "";

    if (intent === "toggle-ingredient") {
      const recipeId = entry.fields.shoppingRecipeId ?? "";
      const ingredientId = entry.fields.ingredientId ?? "";
      const purchased = entry.fields.purchased === "true";
      shoppingRecipes = shoppingRecipes.map((recipe) =>
        recipe.id !== recipeId
          ? recipe
          : {
              ...recipe,
              ingredients: setIngredientPurchased(recipe.ingredients, ingredientId, purchased),
            },
      );
      continue;
    }

    if (intent === "remove-recipe") {
      const recipeId = entry.fields.shoppingRecipeId ?? "";
      shoppingRecipes = shoppingRecipes.filter((recipe) => recipe.id !== recipeId);
      continue;
    }

    if (intent === "clear-recipe-purchased") {
      const recipeId = entry.fields.shoppingRecipeId ?? "";
      shoppingRecipes = shoppingRecipes.map((recipe) =>
        recipe.id !== recipeId
          ? recipe
          : {
              ...recipe,
              ingredients: recipe.ingredients.map((ingredient) =>
                ingredient.purchased ? { ...ingredient, purchased: false } : ingredient,
              ),
            },
      );
      continue;
    }

    if (intent === "add-odd-bit") {
      const id = (entry.fields.clientPendingId ?? "").trim();
      const name = (entry.fields.name ?? "").trim();
      if (!id || !name) continue;
      if (oddBits.some((bit) => bit.id === id)) continue;
      const bit: OddBit = {
        id,
        name,
        amount: parseAmount(entry.fields.amount),
        unit: entry.fields.unit?.trim() ? entry.fields.unit.trim() : null,
        purchased: false,
      };
      oddBits = [...oddBits, bit];
      continue;
    }

    if (intent === "toggle-odd-bit") {
      const id = entry.fields.id ?? "";
      const purchased = entry.fields.purchased === "true";
      oddBits = oddBits.map((bit) => (bit.id === id ? { ...bit, purchased } : bit));
      continue;
    }

    if (intent === "remove-odd-bit") {
      const id = entry.fields.id ?? "";
      oddBits = oddBits.filter((bit) => bit.id !== id);
      continue;
    }

    if (intent === "clear-odd-bits-purchased") {
      oddBits = oddBits.map((bit) => (bit.purchased ? { ...bit, purchased: false } : bit));
      continue;
    }

    if (intent === "toggle") {
      const name = entry.fields.name ?? "";
      const purchased = entry.fields.purchased === "true";
      shoppingRecipes = shoppingRecipes.map((recipe) => ({
        ...recipe,
        ingredients: setPurchasedByName(recipe.ingredients, name, purchased),
      }));
      oddBits = oddBits.map((bit) =>
        getCanonicalIngredientName(bit.name) === getCanonicalIngredientName(name)
          ? { ...bit, purchased }
          : bit,
      );
      continue;
    }

    if (intent === "set-category") {
      const name = entry.fields.name ?? "";
      const section = entry.fields.section as ShoppingSection | undefined;
      if (!name || !section) continue;
      categoryOverrides = {
        ...categoryOverrides,
        [getCanonicalIngredientName(name)]: section,
      };
      continue;
    }

    if (intent === "clear-all-purchased") {
      shoppingRecipes = shoppingRecipes.map((recipe) => ({
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) =>
          ingredient.purchased ? { ...ingredient, purchased: false } : ingredient,
        ),
      }));
      oddBits = oddBits.map((bit) => (bit.purchased ? { ...bit, purchased: false } : bit));
    }
  }

  return {
    ...snapshot,
    shoppingRecipes,
    oddBits,
    categoryOverrides,
  };
}
