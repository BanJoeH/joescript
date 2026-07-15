import { endOfZonedDay, parseDateTimeInput } from "~/lib/dates";
import { getOptionalString, getString } from "~/lib/forms.server";
import type { CompleteWorkoutInput, DraftWorkoutInput } from "~/services/workouts.service";

type ParsedExerciseJson = Array<{
  exerciseId?: string;
  name?: string;
  sets?: Array<{
    reps?: string;
    weightKg?: string;
    durationSeconds?: string;
    distanceM?: string;
  }>;
}>;

function parseExercisesJson(raw: string): ParsedExerciseJson {
  if (!raw.trim()) return [];
  return JSON.parse(raw) as ParsedExerciseJson;
}

function mapExercises(parsed: ParsedExerciseJson, { requireSets }: { requireSets: boolean }) {
  const exercises = parsed
    .map((item) => ({
      exerciseId: item.exerciseId || undefined,
      name: item.name,
      sets: (item.sets ?? [])
        .map((set) => ({
          reps: set.reps ? Number(set.reps) : undefined,
          weightKg: set.weightKg ? Number(set.weightKg) : undefined,
          durationSeconds: set.durationSeconds ? Number(set.durationSeconds) : undefined,
          distanceM: set.distanceM ? Number(set.distanceM) : undefined,
        }))
        .filter((set) => set.reps || set.weightKg || set.durationSeconds || set.distanceM),
    }))
    .filter((item) => Boolean(item.exerciseId || item.name?.trim()));

  if (requireSets) {
    return exercises.filter((item) => item.sets.length > 0);
  }
  return exercises;
}

function optionalRating(formData: FormData, key: string) {
  const raw = getOptionalString(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseCompletedAt(formData: FormData, timeZone: string, existingCompletedAt?: Date | null) {
  const dateRaw = getOptionalString(formData, "performedOn");
  const timeRaw = getOptionalString(formData, "performedAtTime");

  if (!dateRaw) {
    return existingCompletedAt ?? new Date();
  }
  if (!timeRaw) {
    throw new Error("Pick a time for the workout.");
  }

  const parsed = parseDateTimeInput(dateRaw, timeRaw, timeZone);
  if (!parsed) {
    throw new Error("Invalid workout date or time.");
  }
  if (parsed.getTime() > Date.now() + 60_000) {
    throw new Error("Workout time can’t be in the future.");
  }
  if (parsed > endOfZonedDay(new Date(), timeZone)) {
    throw new Error("Workout date can’t be in the future.");
  }

  return parsed;
}

export function parseWorkoutFormData(
  formData: FormData,
  timeZone: string,
  options?: { existingCompletedAt?: Date | null },
): CompleteWorkoutInput {
  const exercises = mapExercises(parseExercisesJson(getString(formData, "exercisesJson")), {
    requireSets: true,
  });

  if (exercises.length === 0) {
    throw new Error("Add at least one exercise.");
  }

  const durationMinutes = getOptionalString(formData, "durationMinutes");

  return {
    title: getOptionalString(formData, "title") || undefined,
    energyBefore: Number(getString(formData, "energyBefore")),
    energyAfter: Number(getString(formData, "energyAfter")),
    worthIt: Number(getString(formData, "worthIt")),
    notes: getOptionalString(formData, "notes") || undefined,
    durationSeconds: durationMinutes ? Math.round(Number(durationMinutes) * 60) : undefined,
    completedAt: parseCompletedAt(formData, timeZone, options?.existingCompletedAt),
    exercises,
  };
}

export function parseDraftWorkoutFormData(formData: FormData): DraftWorkoutInput {
  const exercises = mapExercises(
    parseExercisesJson(getOptionalString(formData, "exercisesJson") ?? "[]"),
    { requireSets: false },
  );
  const durationMinutes = getOptionalString(formData, "durationMinutes");

  return {
    title: getOptionalString(formData, "title") || undefined,
    energyBefore: optionalRating(formData, "energyBefore"),
    energyAfter: optionalRating(formData, "energyAfter"),
    worthIt: optionalRating(formData, "worthIt"),
    notes: getOptionalString(formData, "notes") || undefined,
    durationSeconds: durationMinutes ? Math.round(Number(durationMinutes) * 60) : null,
    exercises,
  };
}
