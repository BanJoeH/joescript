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
export type ShoppingIngredient = RecipeIngredient & { purchased: boolean; id: string };

/** Ad-hoc shopping item stored as its own `odd_bit_items` row. */
export type OddBit = ShoppingIngredient;

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
  id: z.string().trim().min(1).optional(),
});

const recipeStepSchema = z.object({
  order: z.number().int().nonnegative(),
  text: z.string().trim().min(1),
});

export const recipeIngredientsSchema = z.array(recipeIngredientSchema);
export const shoppingIngredientsSchema = z.array(shoppingIngredientSchema);
export const recipeStepsSchema = z.array(recipeStepSchema);

type ParsedShoppingIngredient = RecipeIngredient & { purchased: boolean; id?: string };

export function parseRecipeIngredients(value: unknown): RecipeIngredient[] {
  return recipeIngredientsSchema.parse(value);
}

export function parseShoppingIngredients(value: unknown): ParsedShoppingIngredient[] {
  return shoppingIngredientsSchema.parse(value);
}

export function parseRecipeSteps(value: unknown): RecipeStep[] {
  return recipeStepsSchema.parse(value);
}

export function serializeRecipeIngredients(ingredients: RecipeIngredient[]): string {
  return JSON.stringify(recipeIngredientsSchema.parse(ingredients));
}

export function serializeShoppingIngredients(ingredients: ShoppingIngredient[]): string {
  return JSON.stringify(
    ingredients.map((ingredient) => shoppingIngredientSchema.parse(ingredient)),
  );
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
): ParsedShoppingIngredient[] {
  if (!json) return [];
  try {
    return parseShoppingIngredients(JSON.parse(json));
  } catch {
    return [];
  }
}

/** Ensure every shopping ingredient has a stable id. Returns whether any were minted. */
export function ensureShoppingIngredientIds(ingredients: ParsedShoppingIngredient[]): {
  ingredients: ShoppingIngredient[];
  changed: boolean;
} {
  let changed = false;
  const next = ingredients.map((ingredient) => {
    if (ingredient.id) {
      return ingredient as ShoppingIngredient;
    }
    changed = true;
    return { ...ingredient, id: crypto.randomUUID() };
  });
  return { ingredients: next, changed };
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
  return ingredients.map((ingredient) => ({
    ...ingredient,
    purchased: false,
    id: crypto.randomUUID(),
  }));
}

/**
 * Rebuild shopping ingredients from a recipe snapshot while preserving purchased
 * flags and ids by canonical name. Each prior line contributes one token that
 * the first matching next line can consume.
 */
export function mergeShoppingIngredients(
  previous: ShoppingIngredient[],
  next: RecipeIngredient[],
): ShoppingIngredient[] {
  const priorByCanonical = new Map<string, ShoppingIngredient[]>();
  for (const ingredient of previous) {
    const key = getCanonicalIngredientName(ingredient.name);
    const queue = priorByCanonical.get(key);
    if (queue) queue.push(ingredient);
    else priorByCanonical.set(key, [ingredient]);
  }

  return next.map((ingredient) => {
    const key = getCanonicalIngredientName(ingredient.name);
    const queue = priorByCanonical.get(key);
    const prior = queue?.shift();
    return {
      ...ingredient,
      id: prior?.id ?? crypto.randomUUID(),
      purchased: prior?.purchased ?? false,
    };
  });
}
