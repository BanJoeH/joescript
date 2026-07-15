import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { measurement, measurementType } from "~/db/schema";
import { auditTimestamps, type MomentumContext, newId } from "~/services/types";

export const SEED_MEASUREMENT_TYPES = [
  { key: "weight", name: "Weight", unit: "kg" },
  { key: "max_pull_ups", name: "Max pull-ups", unit: "reps" },
  { key: "bodyweight", name: "Bodyweight", unit: "kg" },
] as const;

const createMeasurementSchema = z.object({
  measurementTypeId: z.string().min(1),
  value: z.number(),
  recordedAt: z.date().optional(),
  notes: z.string().max(500).optional(),
});

export function createMeasurementsService({ db, userId }: MomentumContext) {
  return {
    async listTypes() {
      await ensureSeedTypes(db);
      return db
        .select({
          id: measurementType.id,
          key: measurementType.key,
          name: measurementType.name,
          unit: measurementType.unit,
        })
        .from(measurementType)
        .where(isNull(measurementType.deletedAt))
        .orderBy(asc(measurementType.name));
    },

    async latestByType() {
      const types = await this.listTypes();
      const results = [];

      for (const type of types) {
        const [row] = await db
          .select({
            id: measurement.id,
            value: measurement.value,
            recordedAt: measurement.recordedAt,
            notes: measurement.notes,
          })
          .from(measurement)
          .where(
            and(
              eq(measurement.userId, userId),
              eq(measurement.measurementTypeId, type.id),
              isNull(measurement.deletedAt),
            ),
          )
          .orderBy(desc(measurement.recordedAt))
          .limit(1);

        if (row) {
          results.push({ ...type, latest: row });
        }
      }

      return results;
    },

    async series(measurementTypeId: string, limit = 500) {
      return db
        .select({
          id: measurement.id,
          value: measurement.value,
          recordedAt: measurement.recordedAt,
          notes: measurement.notes,
        })
        .from(measurement)
        .where(
          and(
            eq(measurement.userId, userId),
            eq(measurement.measurementTypeId, measurementTypeId),
            isNull(measurement.deletedAt),
          ),
        )
        .orderBy(asc(measurement.recordedAt))
        .limit(limit);
    },

    async listForInsights(limit = 60) {
      await ensureSeedTypes(db);
      return db
        .select({
          id: measurement.id,
          value: measurement.value,
          recordedAt: measurement.recordedAt,
          typeKey: measurementType.key,
          typeName: measurementType.name,
          unit: measurementType.unit,
        })
        .from(measurement)
        .innerJoin(measurementType, eq(measurement.measurementTypeId, measurementType.id))
        .where(and(eq(measurement.userId, userId), isNull(measurement.deletedAt)))
        .orderBy(desc(measurement.recordedAt))
        .limit(limit);
    },

    async create(input: z.input<typeof createMeasurementSchema>) {
      const data = createMeasurementSchema.parse(input);
      const id = newId();

      await db.insert(measurement).values({
        id,
        userId,
        measurementTypeId: data.measurementTypeId,
        value: data.value,
        recordedAt: data.recordedAt ?? new Date(),
        notes: data.notes?.trim() || null,
        ...auditTimestamps(),
      });

      return id;
    },

    async remove(id: string) {
      const [row] = await db
        .select({ id: measurement.id })
        .from(measurement)
        .where(
          and(
            eq(measurement.id, id),
            eq(measurement.userId, userId),
            isNull(measurement.deletedAt),
          ),
        )
        .limit(1);

      if (!row) {
        return false;
      }

      await db
        .update(measurement)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(measurement.id, id));

      return true;
    },
  };
}

async function ensureSeedTypes(db: MomentumContext["db"]) {
  const existing = await db
    .select({ key: measurementType.key })
    .from(measurementType)
    .where(isNull(measurementType.deletedAt));
  const existingKeys = new Set(existing.map((row) => row.key));

  for (const seed of SEED_MEASUREMENT_TYPES) {
    if (existingKeys.has(seed.key)) continue;
    await db.insert(measurementType).values({
      id: newId(),
      key: seed.key,
      name: seed.name,
      unit: seed.unit,
      ...auditTimestamps(),
    });
  }
}
