import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { careRules, plants } from "~/db/schema";
import { auditFields, type GardenContext, newId, touchFields } from "~/services/types";

const monthsSchema = z.array(z.number().int().min(1).max(12)).min(1);

const createCareRuleInput = z.object({
  plantId: z.string().min(1),
  taskType: z.string().trim().min(1),
  months: monthsSchema,
  instructions: z.string().trim().optional(),
  source: z.string().trim().optional(),
  confidence: z.string().trim().optional(),
  active: z.boolean().optional(),
});

const updateCareRuleInput = createCareRuleInput.partial();

export function createCareRulesService({ db, userId, householdId }: GardenContext) {
  async function assertPlantInHousehold(plantId: string) {
    const [plant] = await db
      .select({ id: plants.id })
      .from(plants)
      .where(
        and(eq(plants.id, plantId), eq(plants.householdId, householdId), isNull(plants.deletedAt)),
      )
      .limit(1);

    if (!plant) {
      throw new Error("Plant not found");
    }
  }

  return {
    async listForPlant(plantId: string) {
      await assertPlantInHousehold(plantId);

      return db
        .select()
        .from(careRules)
        .where(and(eq(careRules.plantId, plantId), isNull(careRules.deletedAt)));
    },

    async get(id: string) {
      const [rule] = await db
        .select({
          id: careRules.id,
          plantId: careRules.plantId,
          plantName: plants.name,
          taskType: careRules.taskType,
          monthsJson: careRules.monthsJson,
          instructions: careRules.instructions,
          source: careRules.source,
          confidence: careRules.confidence,
          active: careRules.active,
          createdAt: careRules.createdAt,
          updatedAt: careRules.updatedAt,
        })
        .from(careRules)
        .innerJoin(plants, eq(careRules.plantId, plants.id))
        .where(
          and(
            eq(careRules.id, id),
            eq(plants.householdId, householdId),
            isNull(careRules.deletedAt),
            isNull(plants.deletedAt),
          ),
        )
        .limit(1);

      return rule ?? null;
    },

    async create(input: z.input<typeof createCareRuleInput>) {
      const data = createCareRuleInput.parse(input);
      await assertPlantInHousehold(data.plantId);

      const id = newId();
      const audit = auditFields(userId);

      await db.insert(careRules).values({
        id,
        plantId: data.plantId,
        taskType: data.taskType,
        monthsJson: JSON.stringify(data.months),
        instructions: data.instructions ?? null,
        source: data.source ?? null,
        confidence: data.confidence ?? null,
        active: data.active ?? true,
        ...audit,
      });

      return this.get(id);
    },

    async update(id: string, input: z.input<typeof updateCareRuleInput>) {
      const data = updateCareRuleInput.parse(input);
      const existing = await this.get(id);
      if (!existing) return null;

      if (data.plantId) {
        await assertPlantInHousehold(data.plantId);
      }

      await db
        .update(careRules)
        .set({
          ...(data.plantId !== undefined ? { plantId: data.plantId } : {}),
          ...(data.taskType !== undefined ? { taskType: data.taskType } : {}),
          ...(data.months !== undefined ? { monthsJson: JSON.stringify(data.months) } : {}),
          ...(data.instructions !== undefined ? { instructions: data.instructions ?? null } : {}),
          ...(data.source !== undefined ? { source: data.source ?? null } : {}),
          ...(data.confidence !== undefined ? { confidence: data.confidence ?? null } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
          ...touchFields(userId),
        })
        .where(eq(careRules.id, id));

      return this.get(id);
    },

    async remove(id: string) {
      const existing = await this.get(id);
      if (!existing) return false;

      await db
        .update(careRules)
        .set({ deletedAt: new Date(), ...touchFields(userId) })
        .where(eq(careRules.id, id));

      return true;
    },
  };
}
