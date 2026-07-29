import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { recipes } from "~/db/schema";
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
import type { PantriContext } from "~/services/types";
import { newId } from "~/services/types";

const recipeInput = z.object({
  name: z.string().trim().min(1),
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
  link: string | null;
  servings: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: typeof recipes.$inferSelect): RecipeRecord {
  return {
    id: row.id,
    pantryId: row.pantryId,
    createdByUserId: row.createdByUserId,
    name: row.name,
    link: row.link,
    servings: row.servings,
    ingredients: parseRecipeIngredientsJson(row.ingredients),
    steps: parseRecipeStepsJson(row.steps),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createRecipesService({ db, userId, pantryId }: PantriContext) {
  const scope = and(eq(recipes.pantryId, pantryId), isNull(recipes.deletedAt));

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
          link: data.link ?? null,
          servings: data.servings ?? null,
          ingredients: serializeRecipeIngredients(data.ingredients),
          steps: serializeRecipeSteps(data.steps),
          updatedAt: new Date(),
        })
        .where(and(eq(recipes.id, recipeId), scope));

      const record = await this.get(recipeId);
      if (!record) throw new Error("Recipe not found");
      return record;
    },

    async remove(recipeId: string): Promise<boolean> {
      const record = await this.get(recipeId);
      if (!record) return false;

      await db
        .update(recipes)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(recipes.id, recipeId));

      return true;
    },
  };
}

export type RecipesService = ReturnType<typeof createRecipesService>;
