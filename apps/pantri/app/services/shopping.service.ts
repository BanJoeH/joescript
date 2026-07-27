import { and, asc, eq, isNull } from "drizzle-orm";

import { recipes, shoppingRecipes } from "~/db/schema";
import { ingredientNamesMatch } from "~/lib/ingredient-name";
import {
  parseRecipeIngredientsJson,
  parseRecipeStepsJson,
  parseShoppingIngredientsJson,
  type ShoppingIngredient,
  serializeRecipeSteps,
  serializeShoppingIngredients,
  toShoppingIngredients,
} from "~/lib/recipe-schema";
import type { PantriContext } from "~/services/types";
import { newId } from "~/services/types";

export type ShoppingRecipeRecord = {
  id: string;
  pantryId: string;
  sourceRecipeId: string | null;
  name: string;
  link: string | null;
  servings: number | null;
  ingredients: ShoppingIngredient[];
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: typeof shoppingRecipes.$inferSelect): ShoppingRecipeRecord {
  return {
    id: row.id,
    pantryId: row.pantryId,
    sourceRecipeId: row.sourceRecipeId,
    name: row.name,
    link: row.link,
    servings: row.servings,
    ingredients: parseShoppingIngredientsJson(row.ingredients),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createShoppingService({ db, userId, pantryId }: PantriContext) {
  const scope = and(eq(shoppingRecipes.pantryId, pantryId), isNull(shoppingRecipes.deletedAt));

  return {
    async list(): Promise<ShoppingRecipeRecord[]> {
      const rows = await db
        .select()
        .from(shoppingRecipes)
        .where(scope)
        .orderBy(asc(shoppingRecipes.name));
      return rows.map(toRecord);
    },

    async get(shoppingRecipeId: string): Promise<ShoppingRecipeRecord | null> {
      const [row] = await db
        .select()
        .from(shoppingRecipes)
        .where(and(eq(shoppingRecipes.id, shoppingRecipeId), scope))
        .limit(1);

      return row ? toRecord(row) : null;
    },

    async addFromRecipe(recipeId: string): Promise<ShoppingRecipeRecord> {
      const [existing] = await db
        .select()
        .from(shoppingRecipes)
        .where(and(eq(shoppingRecipes.sourceRecipeId, recipeId), scope))
        .limit(1);

      if (existing) {
        return toRecord(existing);
      }

      const [recipe] = await db
        .select()
        .from(recipes)
        .where(
          and(eq(recipes.id, recipeId), eq(recipes.pantryId, pantryId), isNull(recipes.deletedAt)),
        )
        .limit(1);

      if (!recipe) {
        throw new Error("Recipe not found");
      }

      const id = newId();
      const now = new Date();
      const ingredients = toShoppingIngredients(parseRecipeIngredientsJson(recipe.ingredients));

      await db.insert(shoppingRecipes).values({
        id,
        pantryId,
        sourceRecipeId: recipe.id,
        createdByUserId: userId,
        name: recipe.name,
        link: recipe.link,
        servings: recipe.servings,
        ingredients: serializeShoppingIngredients(ingredients),
        steps: serializeRecipeSteps(parseRecipeStepsJson(recipe.steps)),
        createdAt: now,
        updatedAt: now,
      });

      const record = await this.get(id);
      if (!record) throw new Error("Failed to add recipe to shopping list");
      return record;
    },

    async remove(shoppingRecipeId: string): Promise<boolean> {
      const record = await this.get(shoppingRecipeId);
      if (!record) return false;

      await db
        .update(shoppingRecipes)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(shoppingRecipes.id, shoppingRecipeId));

      return true;
    },

    async toggleIngredientPurchased(
      shoppingRecipeId: string,
      ingredientIndex: number,
      purchased: boolean,
    ): Promise<ShoppingRecipeRecord> {
      const record = await this.get(shoppingRecipeId);
      if (!record) throw new Error("Shopping recipe not found");

      const ingredients = record.ingredients.map((ingredient, index) =>
        index === ingredientIndex ? { ...ingredient, purchased } : ingredient,
      );

      await db
        .update(shoppingRecipes)
        .set({ ingredients: serializeShoppingIngredients(ingredients), updatedAt: new Date() })
        .where(eq(shoppingRecipes.id, shoppingRecipeId));

      const updated = await this.get(shoppingRecipeId);
      if (!updated) throw new Error("Shopping recipe not found");
      return updated;
    },

    /** Fan a purchased toggle out across every shopping recipe ingredient with a matching canonical name. Used by the sorted view. */
    async setPurchasedByName(ingredientName: string, purchased: boolean): Promise<boolean> {
      const rows = await this.list();
      const matching = rows.filter((row) =>
        row.ingredients.some((ingredient) => ingredientNamesMatch(ingredient.name, ingredientName)),
      );

      if (matching.length === 0) {
        return false;
      }

      for (const row of matching) {
        const ingredients = row.ingredients.map((ingredient) =>
          ingredientNamesMatch(ingredient.name, ingredientName)
            ? { ...ingredient, purchased }
            : ingredient,
        );

        await db
          .update(shoppingRecipes)
          .set({ ingredients: serializeShoppingIngredients(ingredients), updatedAt: new Date() })
          .where(eq(shoppingRecipes.id, row.id));
      }

      return true;
    },
  };
}

export type ShoppingService = ReturnType<typeof createShoppingService>;
