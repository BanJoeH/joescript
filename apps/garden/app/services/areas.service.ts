import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { areas, plants } from "~/db/schema";
import { auditFields, type GardenContext, newId, touchFields } from "~/services/types";

const createAreaInput = z.object({
  name: z.string().trim().min(1),
  sortOrder: z.number().int().optional(),
});

const updateAreaInput = z.object({
  name: z.string().trim().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export function createAreasService({ db, userId, householdId }: GardenContext) {
  return {
    async list() {
      return db
        .select()
        .from(areas)
        .where(and(eq(areas.householdId, householdId), isNull(areas.deletedAt)))
        .orderBy(asc(areas.sortOrder), asc(areas.name));
    },

    async get(id: string) {
      const [area] = await db
        .select()
        .from(areas)
        .where(and(eq(areas.id, id), eq(areas.householdId, householdId), isNull(areas.deletedAt)))
        .limit(1);

      return area ?? null;
    },

    async create(input: z.input<typeof createAreaInput>) {
      const data = createAreaInput.parse(input);
      const existing = await this.list();
      const maxSortOrder = existing.reduce((max, area) => Math.max(max, area.sortOrder), -1);
      const id = newId();
      const audit = auditFields(userId);

      await db.insert(areas).values({
        id,
        householdId,
        name: data.name,
        sortOrder: data.sortOrder ?? maxSortOrder + 1,
        ...audit,
      });

      return this.get(id);
    },

    async update(id: string, input: z.input<typeof updateAreaInput>) {
      const data = updateAreaInput.parse(input);
      const existing = await this.get(id);
      if (!existing) return null;

      await db
        .update(areas)
        .set({
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
          ...touchFields(userId),
        })
        .where(eq(areas.id, id));

      return this.get(id);
    },

    async remove(id: string) {
      const existing = await this.get(id);
      if (!existing) return false;

      const [plantInArea] = await db
        .select({ id: plants.id })
        .from(plants)
        .where(and(eq(plants.areaId, id), isNull(plants.deletedAt)))
        .limit(1);

      if (plantInArea) {
        throw new Error("Move or delete plants in this area first.");
      }

      await db
        .update(areas)
        .set({ deletedAt: new Date(), ...touchFields(userId) })
        .where(eq(areas.id, id));

      return true;
    },

    async reorder(orderedIds: string[]) {
      const existing = await this.list();
      const existingIds = new Set(existing.map((area) => area.id));

      if (orderedIds.length !== existing.length || !orderedIds.every((id) => existingIds.has(id))) {
        throw new Error("Invalid area order");
      }

      await Promise.all(
        orderedIds.map((id, index) =>
          db
            .update(areas)
            .set({ sortOrder: index, ...touchFields(userId) })
            .where(eq(areas.id, id)),
        ),
      );

      return this.list();
    },
  };
}
