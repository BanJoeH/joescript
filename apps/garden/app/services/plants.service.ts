import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { areas, plants } from "~/db/schema";
import { auditFields, newId, touchFields, type GardenContext } from "~/services/types";

const createPlantInput = z.object({
  areaId: z.string().min(1),
  name: z.string().trim().min(1),
  latinName: z.string().trim().optional(),
  cultivar: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  plantedAt: z.date().optional(),
});

const updatePlantInput = createPlantInput.partial().extend({
  plantedAt: z.date().nullable().optional(),
  removedAt: z.date().nullable().optional(),
});

export function createPlantsService({ db, userId, householdId }: GardenContext) {
  return {
    async list() {
      return db
        .select({
          id: plants.id,
          householdId: plants.householdId,
          areaId: plants.areaId,
          areaName: areas.name,
          name: plants.name,
          latinName: plants.latinName,
          cultivar: plants.cultivar,
          notes: plants.notes,
          plantedAt: plants.plantedAt,
          removedAt: plants.removedAt,
          createdAt: plants.createdAt,
          updatedAt: plants.updatedAt,
        })
        .from(plants)
        .innerJoin(areas, eq(plants.areaId, areas.id))
        .where(
          and(
            eq(plants.householdId, householdId),
            isNull(plants.deletedAt),
            isNull(areas.deletedAt),
          ),
        )
        .orderBy(asc(areas.sortOrder), asc(plants.name));
    },

    async get(id: string) {
      const [plant] = await db
        .select({
          id: plants.id,
          householdId: plants.householdId,
          areaId: plants.areaId,
          areaName: areas.name,
          name: plants.name,
          latinName: plants.latinName,
          cultivar: plants.cultivar,
          notes: plants.notes,
          plantedAt: plants.plantedAt,
          removedAt: plants.removedAt,
          createdAt: plants.createdAt,
          updatedAt: plants.updatedAt,
        })
        .from(plants)
        .innerJoin(areas, eq(plants.areaId, areas.id))
        .where(
          and(eq(plants.id, id), eq(plants.householdId, householdId), isNull(plants.deletedAt)),
        )
        .limit(1);

      return plant ?? null;
    },

    async create(input: z.input<typeof createPlantInput>) {
      const data = createPlantInput.parse(input);

      const [area] = await db
        .select({ id: areas.id })
        .from(areas)
        .where(
          and(
            eq(areas.id, data.areaId),
            eq(areas.householdId, householdId),
            isNull(areas.deletedAt),
          ),
        )
        .limit(1);

      if (!area) {
        throw new Error("Area not found");
      }

      const id = newId();
      const audit = auditFields(userId);

      await db.insert(plants).values({
        id,
        householdId,
        areaId: data.areaId,
        name: data.name,
        latinName: data.latinName ?? null,
        cultivar: data.cultivar ?? null,
        notes: data.notes ?? null,
        plantedAt: data.plantedAt ?? null,
        removedAt: null,
        ...audit,
      });

      return this.get(id);
    },

    async update(id: string, input: z.input<typeof updatePlantInput>) {
      const data = updatePlantInput.parse(input);
      const existing = await this.get(id);
      if (!existing) return null;

      if (data.areaId) {
        const [area] = await db
          .select({ id: areas.id })
          .from(areas)
          .where(
            and(
              eq(areas.id, data.areaId),
              eq(areas.householdId, householdId),
              isNull(areas.deletedAt),
            ),
          )
          .limit(1);

        if (!area) {
          throw new Error("Area not found");
        }
      }

      await db
        .update(plants)
        .set({
          ...(data.areaId !== undefined ? { areaId: data.areaId } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.latinName !== undefined ? { latinName: data.latinName ?? null } : {}),
          ...(data.cultivar !== undefined ? { cultivar: data.cultivar ?? null } : {}),
          ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
          ...(data.plantedAt !== undefined ? { plantedAt: data.plantedAt ?? null } : {}),
          ...(data.removedAt !== undefined ? { removedAt: data.removedAt } : {}),
          ...touchFields(userId),
        })
        .where(eq(plants.id, id));

      return this.get(id);
    },

    async remove(id: string) {
      const existing = await this.get(id);
      if (!existing) return false;

      await db
        .update(plants)
        .set({ deletedAt: new Date(), ...touchFields(userId) })
        .where(eq(plants.id, id));

      return true;
    },
  };
}
