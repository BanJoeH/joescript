import type { PantrySnapshotRow } from "~/lib/offline/db";
import { getCanonicalIngredientName, ingredientNamesMatch } from "~/lib/ingredient-name";
import {
  type IngredientCategoryOverrides,
  type ShoppingSection,
  SHOPPING_SECTIONS,
} from "~/lib/ingredient-sections";
import type { ShoppingIngredient } from "~/lib/recipe-schema";

function entriesToMap(entries: Array<[string, string]>) {
  return new Map(entries);
}

function get(map: Map<string, string>, key: string) {
  return map.get(key) ?? "";
}

function isShoppingSection(value: string): value is ShoppingSection {
  return (SHOPPING_SECTIONS as readonly string[]).includes(value);
}

/** Apply a shopping/odd-bits action to a pantry home snapshot. */
export function applyShoppingFormToSnapshot(
  snapshot: PantrySnapshotRow,
  formEntries: Array<[string, string]>,
): PantrySnapshotRow {
  const map = entriesToMap(formEntries);
  const intent = get(map, "intent");
  let shoppingRecipes = snapshot.shoppingRecipes.map((recipe) => ({
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
  }));
  let oddBits = snapshot.oddBits.map((bit) => ({ ...bit }));
  let categoryOverrides: IngredientCategoryOverrides = {
    ...(snapshot.categoryOverrides ?? {}),
  };

  if (intent === "toggle-ingredient") {
    const shoppingRecipeId = get(map, "shoppingRecipeId");
    const ingredientIndex = Number(get(map, "ingredientIndex"));
    const purchased = get(map, "purchased") === "true";
    shoppingRecipes = shoppingRecipes.map((recipe) => {
      if (recipe.id !== shoppingRecipeId) return recipe;
      return {
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient, index) =>
          index === ingredientIndex ? { ...ingredient, purchased } : ingredient,
        ),
      };
    });
  } else if (intent === "remove-recipe") {
    const shoppingRecipeId = get(map, "shoppingRecipeId");
    shoppingRecipes = shoppingRecipes.filter((recipe) => recipe.id !== shoppingRecipeId);
  } else if (intent === "add-odd-bit") {
    const name = get(map, "name").trim();
    if (name) {
      const amountRaw = get(map, "amount").trim();
      const amount = amountRaw ? Number(amountRaw) : null;
      const unit = get(map, "unit").trim() || null;
      const notes = get(map, "notes").trim() || undefined;
      const next: ShoppingIngredient = {
        name,
        amount: amount != null && Number.isFinite(amount) ? amount : null,
        unit,
        notes,
        purchased: false,
      };
      oddBits = [...oddBits, next];
    }
  } else if (intent === "toggle-odd-bit") {
    const index = Number(get(map, "index"));
    const purchased = get(map, "purchased") === "true";
    oddBits = oddBits.map((bit, bitIndex) => (bitIndex === index ? { ...bit, purchased } : bit));
  } else if (intent === "remove-odd-bit") {
    const index = Number(get(map, "index"));
    oddBits = oddBits.filter((_, bitIndex) => bitIndex !== index);
  } else if (intent === "clear-recipe-purchased") {
    const shoppingRecipeId = get(map, "shoppingRecipeId");
    shoppingRecipes = shoppingRecipes.map((recipe) => {
      if (recipe.id !== shoppingRecipeId) return recipe;
      return {
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) =>
          ingredient.purchased ? { ...ingredient, purchased: false } : ingredient,
        ),
      };
    });
  } else if (intent === "clear-odd-bits-purchased") {
    oddBits = oddBits.map((bit) => (bit.purchased ? { ...bit, purchased: false } : bit));
  } else if (intent === "toggle") {
    // Sorted list: toggle by ingredient name across shopping + odd bits.
    const name = get(map, "name");
    const purchased = get(map, "purchased") === "true";
    shoppingRecipes = shoppingRecipes.map((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient) =>
        ingredientNamesMatch(ingredient.name, name) ? { ...ingredient, purchased } : ingredient,
      ),
    }));
    oddBits = oddBits.map((bit) =>
      ingredientNamesMatch(bit.name, name) ? { ...bit, purchased } : bit,
    );
  } else if (intent === "clear-all-purchased") {
    shoppingRecipes = shoppingRecipes.map((recipe) => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ingredient) =>
        ingredient.purchased ? { ...ingredient, purchased: false } : ingredient,
      ),
    }));
    oddBits = oddBits.map((bit) => (bit.purchased ? { ...bit, purchased: false } : bit));
  } else if (intent === "add-to-shopping") {
    const recipeId = get(map, "recipeId") || get(map, "sourceRecipeId");
    const source = snapshot.recipes.find((recipe) => recipe.id === recipeId);
    if (source) {
      const now = new Date().toISOString();
      shoppingRecipes = [
        ...shoppingRecipes,
        {
          id: get(map, "shoppingRecipeId") || crypto.randomUUID(),
          pantryId: snapshot.pantryId,
          sourceRecipeId: source.id,
          name: source.name,
          link: source.link,
          servings: source.servings,
          ingredients: source.ingredients.map((ingredient) => ({
            ...ingredient,
            purchased: false,
          })),
          createdAt: now,
          updatedAt: now,
        },
      ];
    }
  } else if (intent === "set-category") {
    const name = get(map, "name");
    const section = get(map, "section");
    if (name && isShoppingSection(section)) {
      categoryOverrides = {
        ...categoryOverrides,
        [getCanonicalIngredientName(name)]: section,
      };
    }
  }

  return { ...snapshot, shoppingRecipes, oddBits, categoryOverrides };
}

/** Intents allowed to queue while offline (shopping list + sorted only). */
export const SHOPPING_OUTBOX_INTENTS = new Set([
  "toggle-ingredient",
  "remove-recipe",
  "add-odd-bit",
  "toggle-odd-bit",
  "remove-odd-bit",
  "clear-recipe-purchased",
  "clear-odd-bits-purchased",
  "toggle",
  "set-category",
  "clear-all-purchased",
  "add-to-shopping",
]);

export function formDataToEntries(formData: FormData): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") entries.push([key, value]);
  }
  return entries;
}

export function entriesToFormData(entries: Array<[string, string]>) {
  const formData = new FormData();
  for (const [key, value] of entries) {
    formData.append(key, value);
  }
  return formData;
}
