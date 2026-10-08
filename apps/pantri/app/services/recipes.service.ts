import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { recipes } from "~/db/schema";
import { getPantriEnv } from "~/lib/context.server";
import { RECIPE_DESCRIPTION_MAX_LENGTH } from "~/lib/recipe-limits";
import {
  parseRecipeIngredientsJson,
  parseRecipeStepsJson,
  type RecipeIngredient,
  type RecipeStep,
  recipeIngredientsSchema,
  recipeStepsSchema,
  serializeRecipeIngredients,
  serializeRecipeSteps,
} from "~/lib/recipe-schema";
import {
  buildShareOgImageUrl,
  buildShareUrl,
  deleteSharedRecipe,
  newShareToken,
  putSharedRecipe,
  toSharedRecipePayload,
} from "~/lib/recipe-share";
import type { PantriContext } from "~/services/types";
import { newId } from "~/services/types";

export { RECIPE_DESCRIPTION_MAX_LENGTH };

const recipeInput = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().max(RECIPE_DESCRIPTION_MAX_LENGTH).optional(),
  link: z.string().trim().min(1).optional(),
  servings: z.number().int().positive().optional(),
  ingredients: recipeIngredientsSchema,
  steps: recipeStepsSchema,
});

export type RecipeInput = z.input<typeof recipeInput>;

export type RecipeRecord = {
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
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: typeof recipes.$inferSelect): RecipeRecord {
  return {
    id: row.id,
    pantryId: row.pantryId,
    createdByUserId: row.createdByUserId,
    name: row.name,
    description: row.description,
    link: row.link,
    servings: row.servings,
    ingredients: parseRecipeIngredientsJson(row.ingredients),
    steps: parseRecipeStepsJson(row.steps),
    shareToken: row.shareToken,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createRecipesService({ db, userId, pantryId, recipeShares }: PantriContext) {
  const scope = and(eq(recipes.pantryId, pantryId), isNull(recipes.deletedAt));

  async function writeSharePayload(record: RecipeRecord, token: string) {
    await putSharedRecipe(
      recipeShares,
      token,
      toSharedRecipePayload({
        name: record.name,
        description: record.description,
        link: record.link,
        servings: record.servings,
        ingredients: record.ingredients,
        steps: record.steps,
        updatedAt: record.updatedAt,
      }),
    );
  }

  return {
    async list(): Promise<RecipeRecord[]> {
      const rows = await db.select().from(recipes).where(scope).orderBy(asc(recipes.name));
      return rows.map(toRecord);
    },

    async get(recipeId: string): Promise<RecipeRecord | null> {
      const [row] = await db
        .select()
        .from(recipes)
        .where(and(eq(recipes.id, recipeId), scope))
        .limit(1);

      return row ? toRecord(row) : null;
    },

    async create(input: RecipeInput): Promise<RecipeRecord> {
      const data = recipeInput.parse(input);
      const id = newId();
      const now = new Date();

      await db.insert(recipes).values({
        id,
        pantryId,
        createdByUserId: userId,
        name: data.name,
        description: data.description || null,
        link: data.link ?? null,
        servings: data.servings ?? null,
        ingredients: serializeRecipeIngredients(data.ingredients),
        steps: serializeRecipeSteps(data.steps),
        createdAt: now,
        updatedAt: now,
      });

      const record = await this.get(id);
      if (!record) throw new Error("Failed to create recipe");
      return record;
    },

    async update(recipeId: string, input: RecipeInput): Promise<RecipeRecord> {
      const data = recipeInput.parse(input);

      await db
        .update(recipes)
        .set({
          name: data.name,
          description: data.description || null,
          link: data.link ?? null,
          servings: data.servings ?? null,
          ingredients: serializeRecipeIngredients(data.ingredients),
          steps: serializeRecipeSteps(data.steps),
          updatedAt: new Date(),
        })
        .where(and(eq(recipes.id, recipeId), scope));

      const record = await this.get(recipeId);
      if (!record) throw new Error("Recipe not found");
      await this.publishShare(recipeId);
      return record;
    },

    async remove(recipeId: string): Promise<boolean> {
      const record = await this.get(recipeId);
      if (!record) return false;

      if (record.shareToken) {
        await deleteSharedRecipe(recipeShares, record.shareToken);
      }

      await db
        .update(recipes)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
          shareToken: null,
        })
        .where(eq(recipes.id, recipeId));

      return true;
    },

    async ensureShare(
      recipeId: string,
    ): Promise<{ url: string; token: string; ogImageUrl: string }> {
      const record = await this.get(recipeId);
      if (!record) throw new Error("Recipe not found");

      let token = record.shareToken;
      if (!token) {
        token = newShareToken();
        await db
          .update(recipes)
          .set({ shareToken: token, updatedAt: new Date() })
          .where(and(eq(recipes.id, recipeId), scope));
      }

      const latest = (await this.get(recipeId)) ?? record;
      await writeSharePayload(latest, token);

      const { BETTER_AUTH_URL } = getPantriEnv();
      const updatedAtIso = latest.updatedAt.toISOString();
      return {
        url: buildShareUrl(BETTER_AUTH_URL, token),
        token,
        ogImageUrl: buildShareOgImageUrl(BETTER_AUTH_URL, token, updatedAtIso),
      };
    },

    async publishShare(recipeId: string): Promise<boolean> {
      const record = await this.get(recipeId);
      if (!record?.shareToken) return false;
      await writeSharePayload(record, record.shareToken);
      return true;
    },

    async unshare(recipeId: string): Promise<boolean> {
      const record = await this.get(recipeId);
      if (!record) return false;
      if (!record.shareToken) return false;

      await deleteSharedRecipe(recipeShares, record.shareToken);
      await db
        .update(recipes)
        .set({ shareToken: null, updatedAt: new Date() })
        .where(and(eq(recipes.id, recipeId), scope));

      return true;
    },
  };
}

export type RecipesService = ReturnType<typeof createRecipesService>;
