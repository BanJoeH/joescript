import { z } from "zod";

import { getCanonicalIngredientName } from "./ingredient-name";

/** A single structured ingredient line shared by recipes and shopping recipes. */
export type RecipeIngredient = {
  name: string;
  amount: number | null;
  unit: string | null;
  notes?: string;
};

/** A recipe ingredient once it has been added to a shopping list. */
export type ShoppingIngredient = RecipeIngredient & { purchased: boolean };

/** Ad-hoc shopping item stored as its own `odd_bit_items` row. */
export type OddBit = ShoppingIngredient & { id: string };

/** One step of a recipe's method. `order` is 1-indexed and drives display order. */
export type RecipeStep = {
  order: number;
  text: string;
};

/** Optional note: empty/whitespace strings become `undefined`. */
const optionalNotesSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const recipeIngredientSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().finite().nullable(),
  unit: z.string().trim().nullable(),
  notes: optionalNotesSchema,
});

const shoppingIngredientSchema = recipeIngredientSchema.extend({
  purchased: z.boolean(),
});

const recipeStepSchema = z.object({
  order: z.number().int().nonnegative(),
  text: z.string().trim().min(1),
});

export const recipeIngredientsSchema = z.array(recipeIngredientSchema);
export const shoppingIngredientsSchema = z.array(shoppingIngredientSchema);
export const recipeStepsSchema = z.array(recipeStepSchema);

export function parseRecipeIngredients(value: unknown): RecipeIngredient[] {
  return recipeIngredientsSchema.parse(value);
}

export function parseShoppingIngredients(value: unknown): ShoppingIngredient[] {
  return shoppingIngredientsSchema.parse(value);
}

export function parseRecipeSteps(value: unknown): RecipeStep[] {
  return recipeStepsSchema.parse(value);
}

export function serializeRecipeIngredients(ingredients: RecipeIngredient[]): string {
  return JSON.stringify(recipeIngredientsSchema.parse(ingredients));
}

export function serializeShoppingIngredients(ingredients: ShoppingIngredient[]): string {
  return JSON.stringify(shoppingIngredientsSchema.parse(ingredients));
}

export function serializeRecipeSteps(steps: RecipeStep[]): string {
  return JSON.stringify(
    recipeStepsSchema.parse(steps.map((step, index) => ({ ...step, order: index }))),
  );
}

export function parseRecipeIngredientsJson(json: string | null | undefined): RecipeIngredient[] {
  if (!json) return [];
  try {
    return parseRecipeIngredients(JSON.parse(json));
  } catch {
    return [];
  }
}

export function parseShoppingIngredientsJson(
  json: string | null | undefined,
): ShoppingIngredient[] {
  if (!json) return [];
  try {
    return parseShoppingIngredients(JSON.parse(json));
  } catch {
    return [];
  }
}

export function parseRecipeStepsJson(json: string | null | undefined): RecipeStep[] {
  if (!json) return [];
  try {
    return parseRecipeSteps(JSON.parse(json)).sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

export function toShoppingIngredients(ingredients: RecipeIngredient[]): ShoppingIngredient[] {
  return ingredients.map((ingredient) => ({ ...ingredient, purchased: false }));
}

/**
 * Rebuild shopping ingredients from a recipe snapshot while preserving purchased
 * flags by canonical name. Each purchased prior line contributes one token that
 * the first matching next line can consume.
 */
export function mergeShoppingIngredients(
  previous: ShoppingIngredient[],
  next: RecipeIngredient[],
): ShoppingIngredient[] {
  const purchasedTokens = new Map<string, number>();
  for (const ingredient of previous) {
    if (!ingredient.purchased) continue;
    const key = getCanonicalIngredientName(ingredient.name);
    purchasedTokens.set(key, (purchasedTokens.get(key) ?? 0) + 1);
  }

  return next.map((ingredient) => {
    const key = getCanonicalIngredientName(ingredient.name);
    const remaining = purchasedTokens.get(key) ?? 0;
    const purchased = remaining > 0;
    if (purchased) {
      purchasedTokens.set(key, remaining - 1);
    }
    return { ...ingredient, purchased };
  });
}
