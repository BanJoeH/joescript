import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { exercise, workout, workoutExercise, workoutSet } from "~/db/schema";
import { createExercisesService } from "~/services/exercises.service";
import { auditTimestamps, type MomentumContext, newId } from "~/services/types";

const ratingSchema = z.number().int().min(1).max(5);

const setInputSchema = z.object({
  reps: z.number().int().positive().optional(),
  weightKg: z.number().nonnegative().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  distanceM: z.number().nonnegative().optional(),
  roundNumber: z.number().int().positive().optional().nullable(),
  notes: z.string().max(500).optional(),
});

const exerciseInputSchema = z.object({
  exerciseId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  notes: z.string().max(500).optional(),
  sets: z.array(setInputSchema).default([]),
});

const completeWorkoutSchema = z.object({
  title: z.string().max(120).optional(),
  energyBefore: ratingSchema,
  energyAfter: ratingSchema,
  worthIt: ratingSchema,
  notes: z.string().max(200).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  /** When the workout finished (backdated logs). Defaults to now. */
  completedAt: z.date().optional(),
  exercises: z.array(exerciseInputSchema).min(1),
});

const draftWorkoutSchema = z.object({
  title: z.string().max(120).optional(),
  energyBefore: ratingSchema.nullish(),
  energyAfter: ratingSchema.nullish(),
  worthIt: ratingSchema.nullish(),
  notes: z.string().max(200).optional(),
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
  /** Draft “when was this” — stored on startedAt while in progress. */
  performedAt: z.date().optional().nullable(),
  exercises: z.array(exerciseInputSchema).default([]),
});

export type RecentExerciseTemplate = {
  exerciseId: string;
  key: string;
  name: string;
  lastSet: {
    reps?: number | null;
    weightKg?: number | null;
    durationSeconds?: number | null;
    distanceM?: number | null;
  };
};

export type CompleteWorkoutInput = z.input<typeof completeWorkoutSchema>;
export type DraftWorkoutInput = z.input<typeof draftWorkoutSchema>;

export type WorkoutFormDraft = {
  title?: string;
  energyBefore?: number | null;
  energyAfter?: number | null;
  worthIt?: number | null;
  notes?: string | null;
  durationSeconds?: number | null;
  /** ISO timestamp or Date used to prefill the performed-on date field. */
  completedAt?: Date | string | null;
  exercises?: Array<{
    exerciseId: string;
    name: string;
    key?: string;
    sets: Array<{
      reps?: number | null;
      weightKg?: number | null;
      durationSeconds?: number | null;
      distanceM?: number | null;
      roundNumber?: number | null;
    }>;
  }>;
};

function timingFromCompletedAt(completedAt: Date, durationSeconds?: number) {
  const startedAt =
    durationSeconds != null && durationSeconds > 0
      ? new Date(completedAt.getTime() - durationSeconds * 1000)
      : completedAt;
  return { startedAt, completedAt };
}

export function createWorkoutsService({ db, userId }: MomentumContext) {
  const exercisesService = createExercisesService({ db });

  return {
    async list(limit = 50) {
      return db
        .select({
          id: workout.id,
          title: workout.title,
          status: workout.status,
          startedAt: workout.startedAt,
          completedAt: workout.completedAt,
          energyBefore: workout.energyBefore,
          energyAfter: workout.energyAfter,
          worthIt: workout.worthIt,
          durationSeconds: workout.durationSeconds,
          notes: workout.notes,
        })
        .from(workout)
        .where(
          and(
            eq(workout.userId, userId),
            eq(workout.status, "completed"),
            isNull(workout.deletedAt),
          ),
        )
        .orderBy(desc(workout.completedAt), desc(workout.startedAt))
        .limit(limit);
    },

    async latestCompleted() {
      const [row] = await db
        .select()
        .from(workout)
        .where(
          and(
            eq(workout.userId, userId),
            eq(workout.status, "completed"),
            isNull(workout.deletedAt),
          ),
        )
        .orderBy(desc(workout.completedAt))
        .limit(1);

      if (!row) return null;
      return this.getById(row.id);
    },

    async getById(id: string) {
      const [row] = await db
        .select()
        .from(workout)
        .where(and(eq(workout.id, id), eq(workout.userId, userId), isNull(workout.deletedAt)))
        .limit(1);

      if (!row) return null;

      const workoutExercises = await db
        .select({
          id: workoutExercise.id,
          exerciseId: workoutExercise.exerciseId,
          sortOrder: workoutExercise.sortOrder,
          notes: workoutExercise.notes,
          exerciseName: exercise.name,
          exerciseKey: exercise.key,
        })
        .from(workoutExercise)
        .innerJoin(exercise, eq(workoutExercise.exerciseId, exercise.id))
        .where(and(eq(workoutExercise.workoutId, id), isNull(workoutExercise.deletedAt)))
        .orderBy(asc(workoutExercise.sortOrder));

      const exerciseIds = workoutExercises.map((we) => we.id);
      const allSets =
        exerciseIds.length === 0
          ? []
          : await db
              .select()
              .from(workoutSet)
              .where(
                and(
                  inArray(workoutSet.workoutExerciseId, exerciseIds),
                  isNull(workoutSet.deletedAt),
                ),
              )
              .orderBy(asc(workoutSet.sortOrder));

      const setsByExercise = new Map<string, typeof allSets>();
      for (const set of allSets) {
        const list = setsByExercise.get(set.workoutExerciseId) ?? [];
        list.push(set);
        setsByExercise.set(set.workoutExerciseId, list);
      }

      return {
        ...row,
        exercises: workoutExercises.map((we) => ({
          ...we,
          sets: (setsByExercise.get(we.id) ?? []).map((s) => ({
            id: s.id,
            sortOrder: s.sortOrder,
            roundNumber: s.roundNumber,
            reps: s.reps,
            weightKg: s.weightKg,
            durationSeconds: s.durationSeconds,
            distanceM: s.distanceM,
            notes: s.notes,
          })),
        })),
      };
    },

    async getInProgress() {
      const [row] = await db
        .select({ id: workout.id })
        .from(workout)
        .where(
          and(
            eq(workout.userId, userId),
            eq(workout.status, "in_progress"),
            isNull(workout.deletedAt),
          ),
        )
        .orderBy(desc(workout.updatedAt))
        .limit(1);

      if (!row) return null;
      return this.getById(row.id);
    },

    async ensureInProgress() {
      const existing = await this.getInProgress();
      if (existing) return existing;

      const now = new Date();
      const workoutId = newId();
      await db.insert(workout).values({
        id: workoutId,
        userId,
        title: null,
        status: "in_progress",
        startedAt: now,
        completedAt: null,
        energyBefore: null,
        energyAfter: null,
        worthIt: null,
        durationSeconds: null,
        notes: null,
        ...auditTimestamps(),
      });

      return this.getById(workoutId);
    },

    toFormDraft(row: {
      title: string | null;
      energyBefore: number | null;
      energyAfter: number | null;
      worthIt: number | null;
      notes: string | null;
      durationSeconds: number | null;
      completedAt?: Date | null;
      startedAt?: Date | null;
      exercises: Array<{
        exerciseId: string;
        exerciseName: string;
        exerciseKey: string;
        sets: Array<{
          reps: number | null;
          weightKg: number | null;
          durationSeconds: number | null;
          distanceM: number | null;
          roundNumber?: number | null;
        }>;
      }>;
    }): WorkoutFormDraft {
      return {
        title: row.title ?? undefined,
        energyBefore: row.energyBefore,
        energyAfter: row.energyAfter,
        worthIt: row.worthIt,
        notes: row.notes,
        durationSeconds: row.durationSeconds,
        completedAt: row.completedAt ?? row.startedAt ?? null,
        exercises: row.exercises.map((item) => ({
          exerciseId: item.exerciseId,
          name: item.exerciseName,
          key: item.exerciseKey,
          sets: item.sets.map((set) => ({
            reps: set.reps,
            weightKg: set.weightKg,
            durationSeconds: set.durationSeconds,
            distanceM: set.distanceM,
            roundNumber: set.roundNumber ?? null,
          })),
        })),
      };
    },

    async softDeleteExercises(workoutId: string, exerciseRowIds: string[]) {
      const now = new Date();
      if (exerciseRowIds.length > 0) {
        await db
          .update(workoutSet)
          .set({ deletedAt: now, updatedAt: now })
          .where(
            and(
              inArray(workoutSet.workoutExerciseId, exerciseRowIds),
              isNull(workoutSet.deletedAt),
            ),
          );
      }
      await db
        .update(workoutExercise)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(workoutExercise.workoutId, workoutId), isNull(workoutExercise.deletedAt)));
    },

    async saveDraft(id: string, input: DraftWorkoutInput) {
      const existing = await this.getById(id);
      if (existing?.status !== "in_progress") {
        throw new Error("No in-progress workout to save.");
      }

      const data = draftWorkoutSchema.parse(input);
      const now = new Date();
      const title = data.title?.trim() || data.exercises[0]?.name?.trim() || existing.title || null;

      await db
        .update(workout)
        .set({
          title,
          energyBefore: data.energyBefore ?? null,
          energyAfter: data.energyAfter ?? null,
          worthIt: data.worthIt ?? null,
          durationSeconds: data.durationSeconds ?? null,
          notes: data.notes?.trim() || null,
          ...(data.performedAt ? { startedAt: data.performedAt } : {}),
          updatedAt: now,
        })
        .where(and(eq(workout.id, id), eq(workout.userId, userId), isNull(workout.deletedAt)));

      await this.softDeleteExercises(
        id,
        existing.exercises.map((item) => item.id),
      );
      if (data.exercises.length > 0) {
        await this.insertExercisesAndSets(id, data.exercises);
      }

      return this.getById(id);
    },

    async recentExerciseTemplates(limit = 6): Promise<RecentExerciseTemplate[]> {
      const latest = await this.latestCompleted();
      if (!latest) return [];

      const seen = new Set<string>();
      const templates: RecentExerciseTemplate[] = [];
      for (const item of latest.exercises) {
        if (!item.exerciseId || seen.has(item.exerciseId)) continue;
        seen.add(item.exerciseId);
        const last = item.sets[item.sets.length - 1];
        templates.push({
          exerciseId: item.exerciseId,
          key: item.exerciseKey,
          name: item.exerciseName,
          lastSet: {
            reps: last?.reps ?? null,
            weightKg: last?.weightKg ?? null,
            durationSeconds: last?.durationSeconds ?? null,
            distanceM: last?.distanceM ?? null,
          },
        });
        if (templates.length >= limit) break;
      }
      return templates;
    },

    async completeDraft(id: string, input: CompleteWorkoutInput) {
      const existing = await this.getById(id);
      if (existing?.status !== "in_progress") {
        throw new Error("No in-progress workout to complete.");
      }

      const data = completeWorkoutSchema.parse(input);
      const now = new Date();
      const title = data.title?.trim() || data.exercises[0]?.name?.trim() || "Workout";
      const { startedAt, completedAt } = timingFromCompletedAt(
        data.completedAt ?? now,
        data.durationSeconds,
      );

      await db
        .update(workout)
        .set({
          title,
          status: "completed",
          startedAt,
          completedAt,
          energyBefore: data.energyBefore,
          energyAfter: data.energyAfter,
          worthIt: data.worthIt,
          durationSeconds: data.durationSeconds ?? null,
          notes: data.notes?.trim() || null,
          updatedAt: now,
        })
        .where(and(eq(workout.id, id), eq(workout.userId, userId), isNull(workout.deletedAt)));

      await this.softDeleteExercises(
        id,
        existing.exercises.map((item) => item.id),
      );
      await this.insertExercisesAndSets(id, data.exercises);
      // Soft-delete any leftover drafts (e.g. loader race after complete).
      await this.discardAllInProgress();
      return this.getById(id);
    },

    async discardAllInProgress() {
      const rows = await db
        .select({ id: workout.id })
        .from(workout)
        .where(
          and(
            eq(workout.userId, userId),
            eq(workout.status, "in_progress"),
            isNull(workout.deletedAt),
          ),
        );

      let removed = 0;
      for (const row of rows) {
        if (await this.remove(row.id)) removed += 1;
      }
      return removed;
    },

    async discardInProgress(id?: string) {
      const existing = id ? await this.getById(id) : await this.getInProgress();
      if (existing?.status !== "in_progress") {
        return false;
      }
      return this.remove(existing.id);
    },

    async complete(input: CompleteWorkoutInput) {
      const data = completeWorkoutSchema.parse(input);
      const now = new Date();
      const workoutId = newId();
      const title = data.title?.trim() || data.exercises[0]?.name?.trim() || "Workout";
      const { startedAt, completedAt } = timingFromCompletedAt(
        data.completedAt ?? now,
        data.durationSeconds,
      );

      await db.insert(workout).values({
        id: workoutId,
        userId,
        title,
        status: "completed",
        startedAt,
        completedAt,
        energyBefore: data.energyBefore,
        energyAfter: data.energyAfter,
        worthIt: data.worthIt,
        durationSeconds: data.durationSeconds ?? null,
        notes: data.notes?.trim() || null,
        ...auditTimestamps(),
      });

      await this.insertExercisesAndSets(workoutId, data.exercises);

      return this.getById(workoutId);
    },

    async update(id: string, input: CompleteWorkoutInput) {
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error("Workout not found.");
      }

      const data = completeWorkoutSchema.parse(input);
      const now = new Date();
      const title = data.title?.trim() || data.exercises[0]?.name?.trim() || "Workout";
      const { startedAt, completedAt } = timingFromCompletedAt(
        data.completedAt ?? existing.completedAt ?? now,
        data.durationSeconds,
      );

      await db
        .update(workout)
        .set({
          title,
          startedAt,
          completedAt,
          energyBefore: data.energyBefore,
          energyAfter: data.energyAfter,
          worthIt: data.worthIt,
          durationSeconds: data.durationSeconds ?? null,
          notes: data.notes?.trim() || null,
          updatedAt: now,
        })
        .where(and(eq(workout.id, id), eq(workout.userId, userId), isNull(workout.deletedAt)));

      await this.softDeleteExercises(
        id,
        existing.exercises.map((item) => item.id),
      );

      await this.insertExercisesAndSets(id, data.exercises);
      return this.getById(id);
    },

    async remove(id: string) {
      const existing = await this.getById(id);
      if (!existing) {
        return false;
      }

      const now = new Date();
      const exerciseIds = existing.exercises.map((item) => item.id);
      if (exerciseIds.length > 0) {
        await db
          .update(workoutSet)
          .set({ deletedAt: now, updatedAt: now })
          .where(
            and(inArray(workoutSet.workoutExerciseId, exerciseIds), isNull(workoutSet.deletedAt)),
          );
        await db
          .update(workoutExercise)
          .set({ deletedAt: now, updatedAt: now })
          .where(and(eq(workoutExercise.workoutId, id), isNull(workoutExercise.deletedAt)));
      }

      await db
        .update(workout)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(workout.id, id), eq(workout.userId, userId)));

      return true;
    },

    async insertExercisesAndSets(
      workoutId: string,
      items: z.infer<typeof completeWorkoutSchema>["exercises"],
    ) {
      let sortOrder = 0;
      for (const item of items) {
        const resolved = item.exerciseId
          ? (
              await db
                .select()
                .from(exercise)
                .where(and(eq(exercise.id, item.exerciseId), isNull(exercise.deletedAt)))
                .limit(1)
            )[0]
          : await exercisesService.findOrCreateByName(item.name ?? "Exercise");

        if (!resolved) {
          throw new Error("Exercise not found.");
        }

        const workoutExerciseId = newId();
        await db.insert(workoutExercise).values({
          id: workoutExerciseId,
          workoutId,
          exerciseId: resolved.id,
          sortOrder,
          notes: item.notes?.trim() || null,
          ...auditTimestamps(),
        });

        let setOrder = 0;
        for (const set of item.sets) {
          await db.insert(workoutSet).values({
            id: newId(),
            workoutExerciseId,
            sortOrder: setOrder,
            roundNumber: set.roundNumber ?? null,
            reps: set.reps ?? null,
            weightKg: set.weightKg ?? null,
            durationSeconds: set.durationSeconds ?? null,
            distanceM: set.distanceM ?? null,
            notes: set.notes?.trim() || null,
            ...auditTimestamps(),
          });
          setOrder += 1;
        }

        sortOrder += 1;
      }
    },

    asRepeatTemplate(row: NonNullable<Awaited<ReturnType<typeof this.getById>>>) {
      return {
        title: row.title ?? undefined,
        exercises: row.exercises.map((we) => ({
          exerciseId: we.exerciseId,
          name: we.exerciseName,
          key: we.exerciseKey,
          notes: we.notes ?? undefined,
          sets: we.sets.map((s) => ({
            reps: s.reps ?? undefined,
            weightKg: s.weightKg ?? undefined,
            durationSeconds: s.durationSeconds ?? undefined,
            distanceM: s.distanceM ?? undefined,
            roundNumber: s.roundNumber ?? undefined,
            notes: s.notes ?? undefined,
          })),
        })),
      };
    },

    async repeatFrom(id: string) {
      const row = await this.getById(id);
      if (row?.status !== "completed") {
        throw new Error("Workout not found.");
      }
      return this.asRepeatTemplate(row);
    },

    async repeatLatest() {
      const latest = await this.latestCompleted();
      if (!latest) {
        throw new Error("No previous workout to repeat.");
      }
      return this.asRepeatTemplate(latest);
    },

    async listForInsights(limit = 60) {
      return db
        .select({
          id: workout.id,
          completedAt: workout.completedAt,
          energyBefore: workout.energyBefore,
          energyAfter: workout.energyAfter,
          worthIt: workout.worthIt,
          durationSeconds: workout.durationSeconds,
        })
        .from(workout)
        .where(
          and(
            eq(workout.userId, userId),
            eq(workout.status, "completed"),
            isNull(workout.deletedAt),
          ),
        )
        .orderBy(desc(workout.completedAt))
        .limit(limit);
    },
  };
}
