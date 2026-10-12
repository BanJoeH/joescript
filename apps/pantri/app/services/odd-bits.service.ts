import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { oddBitItems } from "~/db/schema";
import { ingredientNamesMatch } from "~/lib/ingredient-name";
import type { OddBit } from "~/lib/recipe-schema";
import type { PantriContext } from "~/services/types";

export const addOddBitInput = z.object({
  /** Client-generated UUID; when set, insert is idempotent on replay. */
  id: z.string().uuid().optional(),
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

function rowToOddBit(row: typeof oddBitItems.$inferSelect): OddBit {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount ?? null,
    unit: row.unit ?? null,
    notes: row.notes ?? undefined,
    purchased: row.purchased,
  };
}

export function createOddBitsService({ db, pantryId }: PantriContext) {
  return {
    async list(): Promise<OddBit[]> {
      const rows = await db
        .select()
        .from(oddBitItems)
        .where(eq(oddBitItems.pantryId, pantryId))
        .orderBy(asc(oddBitItems.createdAt), asc(oddBitItems.id));
      return rows.map(rowToOddBit);
    },

    async add(input: AddOddBitInput): Promise<OddBit> {
      const data = addOddBitInput.parse(input);
      const now = new Date();

      if (data.id) {
        const [existing] = await db
          .select()
          .from(oddBitItems)
          .where(and(eq(oddBitItems.id, data.id), eq(oddBitItems.pantryId, pantryId)))
          .limit(1);
        if (existing) return rowToOddBit(existing);
      }

      const [row] = await db
        .insert(oddBitItems)
        .values({
          ...(data.id ? { id: data.id } : {}),
          pantryId,
          name: data.name,
          amount: data.amount ?? null,
          unit: data.unit ?? null,
          notes: data.notes ?? null,
          purchased: false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning();

      if (row) return rowToOddBit(row);

      // Concurrent replay of the same client id — return the winner.
      if (data.id) {
        const [existing] = await db
          .select()
          .from(oddBitItems)
          .where(and(eq(oddBitItems.id, data.id), eq(oddBitItems.pantryId, pantryId)))
          .limit(1);
        if (existing) return rowToOddBit(existing);
      }
      throw new Error("Failed to add odd bit");
    },

    async remove(id: string): Promise<OddBit[]> {
      const result = await db
        .delete(oddBitItems)
        .where(and(eq(oddBitItems.id, id), eq(oddBitItems.pantryId, pantryId)))
        .returning({ id: oddBitItems.id });
      if (result.length === 0) {
        throw new Error("Odd bit not found");
      }
      return this.list();
    },

    async togglePurchased(id: string, purchased: boolean): Promise<OddBit[]> {
      const result = await db
        .update(oddBitItems)
        .set({ purchased, updatedAt: new Date() })
        .where(and(eq(oddBitItems.id, id), eq(oddBitItems.pantryId, pantryId)))
        .returning({ id: oddBitItems.id });
      if (result.length === 0) {
        throw new Error("Odd bit not found");
      }
      return this.list();
    },

    /** Fan a purchased toggle out across every odd bit with a matching canonical name. Used by the sorted view. */
    async setPurchasedByName(ingredientName: string, purchased: boolean): Promise<boolean> {
      const current = await this.list();
      const matches = current.filter((bit) => ingredientNamesMatch(bit.name, ingredientName));
      if (matches.length === 0) {
        return false;
      }

      const now = new Date();
      await Promise.all(
        matches.map((bit) =>
          db
            .update(oddBitItems)
            .set({ purchased, updatedAt: now })
            .where(and(eq(oddBitItems.id, bit.id), eq(oddBitItems.pantryId, pantryId))),
        ),
      );
      return true;
    },

    async clearAllPurchased(): Promise<boolean> {
      const result = await db
        .update(oddBitItems)
        .set({ purchased: false, updatedAt: new Date() })
        .where(and(eq(oddBitItems.pantryId, pantryId), eq(oddBitItems.purchased, true)))
        .returning({ id: oddBitItems.id });
      return result.length > 0;
    },
  };
}

export type OddBitsService = ReturnType<typeof createOddBitsService>;
