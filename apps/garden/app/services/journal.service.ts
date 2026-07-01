import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { areas, careRules, journalEntries, journalEntryStatuses, plants } from "~/db/schema";
import { resolvePerformedAtForCreate, resolvePerformedAtForUpdate } from "~/lib/dates";
import type { PhotosService } from "~/services/photos.service";
import { auditFields, type GardenContext, newId, touchFields } from "~/services/types";

const createJournalEntryInput = z.object({
  plantId: z.string().optional(),
  areaId: z.string().optional(),
  careRuleId: z.string().optional(),
  taskType: z.string().trim().optional(),
  status: z.enum(journalEntryStatuses),
  notes: z.string().trim().optional(),
  performedAt: z.date(),
});

const updateJournalEntryInput = createJournalEntryInput.partial();

type JournalLinks = {
  plantId: string | null;
  areaId: string | null;
  careRuleId: string | null;
};

export function createJournalService(
  { db, userId, householdId }: GardenContext,
  photos?: PhotosService,
) {
  const householdScope = and(
    eq(journalEntries.householdId, householdId),
    isNull(journalEntries.deletedAt),
  );

  async function assertPlantInHousehold(plantId: string) {
    const [plant] = await db
      .select({ id: plants.id, areaId: plants.areaId })
      .from(plants)
      .where(
        and(eq(plants.id, plantId), eq(plants.householdId, householdId), isNull(plants.deletedAt)),
      )
      .limit(1);

    if (!plant) {
      throw new Error("Plant not found");
    }

    return plant;
  }

  async function assertAreaInHousehold(areaId: string) {
    const [area] = await db
      .select({ id: areas.id })
      .from(areas)
      .where(and(eq(areas.id, areaId), eq(areas.householdId, householdId), isNull(areas.deletedAt)))
      .limit(1);

    if (!area) {
      throw new Error("Area not found");
    }
  }

  async function assertCareRuleInHousehold(careRuleId: string) {
    const [rule] = await db
      .select({ id: careRules.id, plantId: careRules.plantId })
      .from(careRules)
      .innerJoin(plants, eq(careRules.plantId, plants.id))
      .where(
        and(
          eq(careRules.id, careRuleId),
          eq(plants.householdId, householdId),
          isNull(careRules.deletedAt),
          isNull(plants.deletedAt),
        ),
      )
      .limit(1);

    if (!rule) {
      throw new Error("Care rule not found");
    }

    return rule;
  }

  async function validateJournalLinks(links: JournalLinks) {
    let careRulePlantId: string | undefined;

    if (links.careRuleId) {
      const rule = await assertCareRuleInHousehold(links.careRuleId);
      careRulePlantId = rule.plantId;
    }

    let plantAreaId: string | undefined;

    if (links.plantId) {
      const plant = await assertPlantInHousehold(links.plantId);
      plantAreaId = plant.areaId;

      if (careRulePlantId && careRulePlantId !== links.plantId) {
        throw new Error("Care rule does not belong to this plant");
      }
    }

    if (links.areaId) {
      await assertAreaInHousehold(links.areaId);

      if (plantAreaId && plantAreaId !== links.areaId) {
        throw new Error("Plant does not belong to this area");
      }
    }
  }

  return {
    async list(limit = 50) {
      return db
        .select({
          id: journalEntries.id,
          plantId: journalEntries.plantId,
          plantName: plants.name,
          areaId: journalEntries.areaId,
          areaName: areas.name,
          careRuleId: journalEntries.careRuleId,
          taskType: journalEntries.taskType,
          status: journalEntries.status,
          notes: journalEntries.notes,
          performedAt: journalEntries.performedAt,
          createdAt: journalEntries.createdAt,
        })
        .from(journalEntries)
        .leftJoin(plants, eq(journalEntries.plantId, plants.id))
        .leftJoin(areas, eq(journalEntries.areaId, areas.id))
        .where(householdScope)
        .orderBy(desc(journalEntries.performedAt), desc(journalEntries.createdAt))
        .limit(limit);
    },

    async listForPlant(plantId: string, limit = 20) {
      await assertPlantInHousehold(plantId);

      return db
        .select({
          id: journalEntries.id,
          taskType: journalEntries.taskType,
          status: journalEntries.status,
          notes: journalEntries.notes,
          performedAt: journalEntries.performedAt,
        })
        .from(journalEntries)
        .where(and(eq(journalEntries.plantId, plantId), householdScope))
        .orderBy(desc(journalEntries.performedAt), desc(journalEntries.createdAt))
        .limit(limit);
    },

    async get(id: string) {
      const [entry] = await db
        .select({
          id: journalEntries.id,
          plantId: journalEntries.plantId,
          plantName: plants.name,
          areaId: journalEntries.areaId,
          areaName: areas.name,
          careRuleId: journalEntries.careRuleId,
          taskType: journalEntries.taskType,
          status: journalEntries.status,
          notes: journalEntries.notes,
          performedAt: journalEntries.performedAt,
          createdAt: journalEntries.createdAt,
          updatedAt: journalEntries.updatedAt,
        })
        .from(journalEntries)
        .leftJoin(plants, eq(journalEntries.plantId, plants.id))
        .leftJoin(areas, eq(journalEntries.areaId, areas.id))
        .where(and(eq(journalEntries.id, id), householdScope))
        .limit(1);

      return entry ?? null;
    },

    async create(input: z.input<typeof createJournalEntryInput>) {
      const data = createJournalEntryInput.parse(input);

      await validateJournalLinks({
        plantId: data.plantId ?? null,
        areaId: data.areaId ?? null,
        careRuleId: data.careRuleId ?? null,
      });

      const id = newId();
      const audit = auditFields(userId);

      await db.insert(journalEntries).values({
        id,
        householdId,
        plantId: data.plantId ?? null,
        areaId: data.areaId ?? null,
        careRuleId: data.careRuleId ?? null,
        taskType: data.taskType ?? null,
        status: data.status,
        notes: data.notes ?? null,
        performedAt: resolvePerformedAtForCreate(data.performedAt),
        ...audit,
      });

      return this.get(id);
    },

    async update(id: string, input: z.input<typeof updateJournalEntryInput>) {
      const data = updateJournalEntryInput.parse(input);
      const existing = await this.get(id);
      if (!existing) return null;

      await validateJournalLinks({
        plantId: data.plantId !== undefined ? (data.plantId ?? null) : existing.plantId,
        areaId: data.areaId !== undefined ? (data.areaId ?? null) : existing.areaId,
        careRuleId: data.careRuleId !== undefined ? (data.careRuleId ?? null) : existing.careRuleId,
      });

      const performedAt =
        data.performedAt !== undefined
          ? resolvePerformedAtForUpdate(data.performedAt, existing.performedAt)
          : undefined;

      await db
        .update(journalEntries)
        .set({
          ...(data.plantId !== undefined ? { plantId: data.plantId ?? null } : {}),
          ...(data.areaId !== undefined ? { areaId: data.areaId ?? null } : {}),
          ...(data.careRuleId !== undefined ? { careRuleId: data.careRuleId ?? null } : {}),
          ...(data.taskType !== undefined ? { taskType: data.taskType ?? null } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
          ...(performedAt !== undefined ? { performedAt } : {}),
          ...touchFields(userId),
        })
        .where(eq(journalEntries.id, id));

      return this.get(id);
    },

    async remove(id: string) {
      const existing = await this.get(id);
      if (!existing) return false;

      if (photos) {
        await photos.removeForEntry(id);
      }

      await db
        .update(journalEntries)
        .set({ deletedAt: new Date(), ...touchFields(userId) })
        .where(eq(journalEntries.id, id));

      return true;
    },
  };
}
