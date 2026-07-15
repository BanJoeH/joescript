import { and, asc, eq, isNull } from "drizzle-orm";

import { exercise } from "~/db/schema";
import { auditTimestamps, type MomentumContext, newId } from "~/services/types";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "exercise";

export const SEED_EXERCISES = [
  { key: "pull-up", name: "Pull-up" },
  { key: "push-up", name: "Push-up" },
  { key: "squat", name: "Squat" },
  { key: "deadlift", name: "Deadlift" },
  { key: "bench-press", name: "Bench press" },
  { key: "row", name: "Row" },
  { key: "run", name: "Run" },
  { key: "dead-hang", name: "Dead hang" },
  { key: "plank", name: "Plank" },
  { key: "overhead-press", name: "Overhead press" },
] as const;

export function createExercisesService({ db }: Pick<MomentumContext, "db">) {
  return {
    async list() {
      await ensureSeedExercises(db);
      return db
        .select({
          id: exercise.id,
          key: exercise.key,
          name: exercise.name,
        })
        .from(exercise)
        .where(isNull(exercise.deletedAt))
        .orderBy(asc(exercise.name));
    },

    async findOrCreateByName(name: string) {
      await ensureSeedExercises(db);
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error("Exercise name is required.");
      }

      const key = slugify(trimmed);
      const [existing] = await db
        .select()
        .from(exercise)
        .where(and(eq(exercise.key, key), isNull(exercise.deletedAt)))
        .limit(1);

      if (existing) {
        return existing;
      }

      const id = newId();
      await db.insert(exercise).values({
        id,
        key,
        name: trimmed,
        ...auditTimestamps(),
      });

      const [created] = await db.select().from(exercise).where(eq(exercise.id, id)).limit(1);
      if (!created) {
        throw new Error("Could not create exercise.");
      }
      return created;
    },
  };
}

async function ensureSeedExercises(db: MomentumContext["db"]) {
  const existing = await db
    .select({ key: exercise.key })
    .from(exercise)
    .where(isNull(exercise.deletedAt));
  const existingKeys = new Set(existing.map((row) => row.key));

  for (const seed of SEED_EXERCISES) {
    if (existingKeys.has(seed.key)) continue;
    await db.insert(exercise).values({
      id: newId(),
      key: seed.key,
      name: seed.name,
      ...auditTimestamps(),
    });
  }
}
