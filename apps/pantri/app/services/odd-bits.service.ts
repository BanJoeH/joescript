import { eq } from "drizzle-orm";
import { z } from "zod";

import { oddBits } from "~/db/schema";
import { ingredientNamesMatch } from "~/lib/ingredient-name";
import {
  parseShoppingIngredientsJson,
  type ShoppingIngredient,
  serializeShoppingIngredients,
} from "~/lib/recipe-schema";
import type { PantriContext } from "~/services/types";

const addOddBitInput = z.object({
  name: z.string().trim().min(1),
  amount: z.number().finite().nullable().optional(),
  unit: z.string().trim().min(1).nullable().optional(),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type AddOddBitInput = z.input<typeof addOddBitInput>;

export function createOddBitsService({ db, pantryId }: PantriContext) {
  async function getRow() {
    const [row] = await db.select().from(oddBits).where(eq(oddBits.pantryId, pantryId)).limit(1);
    return row ?? null;
  }

  async function setIngredients(ingredients: ShoppingIngredient[]) {
    const row = await getRow();
    const now = new Date();
    const serialized = serializeShoppingIngredients(ingredients);

    if (row) {
      await db
        .update(oddBits)
        .set({ ingredients: serialized, updatedAt: now })
        .where(eq(oddBits.id, row.id));
    } else {
      await db.insert(oddBits).values({
        pantryId,
        ingredients: serialized,
        createdAt: now,
        updatedAt: now,
      });
    }

    return ingredients;
  }

  return {
    async list(): Promise<ShoppingIngredient[]> {
      const row = await getRow();
      return parseShoppingIngredientsJson(row?.ingredients);
    },

    async add(input: AddOddBitInput): Promise<ShoppingIngredient[]> {
      const data = addOddBitInput.parse(input);
      const current = await this.list();
      return setIngredients([
        ...current,
        {
          name: data.name,
          amount: data.amount ?? null,
          unit: data.unit ?? null,
          notes: data.notes,
          purchased: false,
        },
      ]);
    },

    async remove(index: number): Promise<ShoppingIngredient[]> {
      const current = await this.list();
      return setIngredients(current.filter((_, i) => i !== index));
    },

    async togglePurchased(index: number, purchased: boolean): Promise<ShoppingIngredient[]> {
      const current = await this.list();
      return setIngredients(
        current.map((ingredient, i) => (i === index ? { ...ingredient, purchased } : ingredient)),
      );
    },

    /** Fan a purchased toggle out across every odd bit with a matching canonical name. Used by the sorted view. */
    async setPurchasedByName(ingredientName: string, purchased: boolean): Promise<boolean> {
      const current = await this.list();
      if (!current.some((ingredient) => ingredientNamesMatch(ingredient.name, ingredientName))) {
        return false;
      }

      await setIngredients(
        current.map((ingredient) =>
          ingredientNamesMatch(ingredient.name, ingredientName)
            ? { ...ingredient, purchased }
            : ingredient,
        ),
      );
      return true;
    },

    async clearAllPurchased(): Promise<boolean> {
      const current = await this.list();
      if (!current.some((ingredient) => ingredient.purchased)) return false;
      await setIngredients(
        current.map((ingredient) =>
          ingredient.purchased ? { ...ingredient, purchased: false } : ingredient,
        ),
      );
      return true;
    },
  };
}

export type OddBitsService = ReturnType<typeof createOddBitsService>;
