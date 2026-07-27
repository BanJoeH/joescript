import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import {
  createdAtColumn,
  deletedAtColumn,
  idColumn,
  optionalTimestampColumn,
  updatedAtColumn,
} from "./columns";

export const exercise = sqliteTable("exercise", {
  id: idColumn(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
});

export const workout = sqliteTable("workout", {
  id: idColumn(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title"),
  status: text("status", { enum: ["in_progress", "completed"] })
    .notNull()
    .default("in_progress"),
  startedAt: optionalTimestampColumn("started_at"),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  energyBefore: integer("energy_before"),
  energyAfter: integer("energy_after"),
  worthIt: integer("worth_it"),
  durationSeconds: integer("duration_seconds"),
  notes: text("notes"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
});

export const workoutExercise = sqliteTable("workout_exercise", {
  id: idColumn(),
  workoutId: text("workout_id")
    .notNull()
    .references(() => workout.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercise.id, { onDelete: "restrict" }),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
});

export const workoutSet = sqliteTable("workout_set", {
  id: idColumn(),
  workoutExerciseId: text("workout_exercise_id")
    .notNull()
    .references(() => workoutExercise.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Circuit round; null for straight-set workouts. */
  roundNumber: integer("round_number"),
  reps: integer("reps"),
  weightKg: real("weight_kg"),
  durationSeconds: integer("duration_seconds"),
  distanceM: real("distance_m"),
  repsInReserve: integer("reps_in_reserve"),
  notes: text("notes"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
});

export const measurementType = sqliteTable("measurement_type", {
  id: idColumn(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
});

export const measurement = sqliteTable("measurement", {
  id: idColumn(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  measurementTypeId: text("measurement_type_id")
    .notNull()
    .references(() => measurementType.id, { onDelete: "restrict" }),
  value: real("value").notNull(),
  recordedAt: optionalTimestampColumn("recorded_at"),
  notes: text("notes"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
});
