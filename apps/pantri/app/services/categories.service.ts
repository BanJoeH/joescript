import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { ingredientCategories } from "~/db/schema";
import { getCanonicalIngredientName } from "~/lib/ingredient-name";
import { type IngredientCategoryOverrides, SHOPPING_SECTIONS } from "~/lib/ingredient-sections";
import type { PantriContext } from "~/services/types";
import { newId } from "~/services/types";

const setCategoryInput = z.object({
  name: z.string().trim().min(1),
  section: z.enum(SHOPPING_SECTIONS),
});

export type SetCategoryInput = z.input<typeof setCategoryInput>;

export function createCategoriesService({ db, pantryId }: PantriContext) {
  return {
    async list() {
      return db
        .select()
        .from(ingredientCategories)
        .where(eq(ingredientCategories.pantryId, pantryId));
    },

    async getOverrides(): Promise<IngredientCategoryOverrides> {
      const rows = await this.list();
      return Object.fromEntries(
        rows.map((row) => [row.canonicalName, row.section]),
      ) as IngredientCategoryOverrides;
    },

    async set(input: SetCategoryInput) {
      const data = setCategoryInput.parse(input);
      const canonicalName = getCanonicalIngredientName(data.name);
      const now = new Date();

      const [existing] = await db
        .select({ id: ingredientCategories.id })
        .from(ingredientCategories)
        .where(
          and(
            eq(ingredientCategories.pantryId, pantryId),
            eq(ingredientCategories.canonicalName, canonicalName),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .update(ingredientCategories)
          .set({ section: data.section, updatedAt: now })
          .where(eq(ingredientCategories.id, existing.id));
        return existing.id;
      }

      const id = newId();
      await db.insert(ingredientCategories).values({
        id,
        pantryId,
        canonicalName,
        section: data.section,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    },

    async remove(id: string) {
      await db
        .delete(ingredientCategories)
        .where(and(eq(ingredientCategories.id, id), eq(ingredientCategories.pantryId, pantryId)));
    },
  };
}

export type CategoriesService = ReturnType<typeof createCategoriesService>;
