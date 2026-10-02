import { z } from "zod";

import {
  parseRecipeIngredients,
  parseRecipeSteps,
  type RecipeIngredient,
  type RecipeStep,
  recipeIngredientsSchema,
  recipeStepsSchema,
} from "~/lib/recipe-schema";

export const sharedRecipePayloadSchema = z.object({
  v: z.literal(1),
  name: z.string().trim().min(1),
  link: z.string().trim().nullable(),
  servings: z.number().int().positive().nullable(),
  ingredients: recipeIngredientsSchema,
  steps: recipeStepsSchema,
  updatedAt: z.string().datetime({ offset: true }),
});

export type SharedRecipePayload = z.infer<typeof sharedRecipePayloadSchema>;

export function newShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function isShareToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{16,32}$/.test(value);
}

export function buildShareUrl(baseUrl: string, token: string): string {
  const origin = baseUrl.replace(/\/+$/, "");
  return `${origin}/r/${token}`;
}

export function toSharedRecipePayload(input: {
  name: string;
  link: string | null;
  servings: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  updatedAt: Date | string;
}): SharedRecipePayload {
  const updatedAt =
    input.updatedAt instanceof Date ? input.updatedAt.toISOString() : input.updatedAt;

  return sharedRecipePayloadSchema.parse({
    v: 1,
    name: input.name,
    link: input.link,
    servings: input.servings,
    ingredients: parseRecipeIngredients(input.ingredients),
    steps: parseRecipeSteps(input.steps),
    updatedAt,
  });
}

export function parseSharedRecipePayload(value: unknown): SharedRecipePayload | null {
  const parsed = sharedRecipePayloadSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function getSharedRecipe(
  kv: KVNamespace,
  token: string,
): Promise<SharedRecipePayload | null> {
  if (!isShareToken(token)) return null;

  // No cacheTtl: unshare/delete must take effect on the next request.
  const value = await kv.get(token, { type: "json" });

  return parseSharedRecipePayload(value);
}

export async function putSharedRecipe(
  kv: KVNamespace,
  token: string,
  payload: SharedRecipePayload,
): Promise<void> {
  await kv.put(token, JSON.stringify(sharedRecipePayloadSchema.parse(payload)));
}

export async function deleteSharedRecipe(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(token);
}

export function sharedRecipeDescription(payload: SharedRecipePayload): string {
  const parts: string[] = [];
  const ingredientCount = payload.ingredients.length;
  parts.push(`${ingredientCount} ingredient${ingredientCount === 1 ? "" : "s"}`);
  if (payload.servings) {
    parts.push(`Serves ${payload.servings}`);
  }
  parts.push("Shared on Pantri");
  return parts.join(" · ");
}
