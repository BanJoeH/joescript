import type { ShouldRevalidateFunctionArgs } from "react-router";
import { redirect, useActionData, useLoaderData } from "react-router";

import { WorkoutLogForm } from "~/components/workout-log-form";
import { getString } from "~/lib/forms.server";
import { parseDraftWorkoutFormData, parseWorkoutFormData } from "~/lib/workout-form.server";
import { requireMomentumService } from "~/services";

import type { Route } from "./+types/workouts.log";

function parseEnergyBeforeParam(raw: string | null) {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 5) return null;
  return value;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { service, timeZone } = await requireMomentumService(request);
  const url = new URL(request.url);
  const repeatParam = url.searchParams.get("repeat");
  const repeatLatest = repeatParam === "1";
  const repeatFromId = repeatParam && repeatParam !== "1" ? repeatParam : null;
  const wantsRepeat = repeatLatest || Boolean(repeatFromId);
  // Only create a draft when intentionally starting (avoids revalidation races
  // after complete/autosave leaving a fresh empty "Continue Workout").
  const start = url.searchParams.get("start") === "1" || wantsRepeat;
  const seedEnergyBefore = parseEnergyBeforeParam(url.searchParams.get("energyBefore"));

  // libsql web client is not safe for concurrent queries on one connection.
  const exercises = await service.exercises.list();
  let workout = await service.workouts.getInProgress();

  if (wantsRepeat && workout) {
    // Starting a templated session replaces any leftover draft.
    await service.workouts.discardInProgress(workout.id);
    workout = null;
  }

  if (!workout) {
    if (!start) {
      throw redirect("/");
    }
    workout = await service.workouts.ensureInProgress();
    if (!workout) {
      throw new Error("Could not start workout.");
    }
    if (wantsRepeat) {
      const template = repeatFromId
        ? await service.workouts.repeatFrom(repeatFromId).catch(() => null)
        : await service.workouts.repeatLatest().catch(() => null);
      if (template) {
        await service.workouts.saveDraft(workout.id, {
          title: template.title,
          exercises: template.exercises,
          ...(seedEnergyBefore != null ? { energyBefore: seedEnergyBefore } : {}),
        });
        workout = (await service.workouts.getById(workout.id)) ?? workout;
      } else if (seedEnergyBefore != null) {
        await service.workouts.saveDraft(workout.id, {
          energyBefore: seedEnergyBefore,
          exercises: [],
        });
        workout = (await service.workouts.getById(workout.id)) ?? workout;
      }
    } else if (seedEnergyBefore != null) {
      await service.workouts.saveDraft(workout.id, {
        energyBefore: seedEnergyBefore,
        exercises: [],
      });
      workout = (await service.workouts.getById(workout.id)) ?? workout;
    }
  } else if (seedEnergyBefore != null && workout.energyBefore == null) {
    await service.workouts.saveDraft(workout.id, {
      energyBefore: seedEnergyBefore,
      energyAfter: workout.energyAfter,
      worthIt: workout.worthIt,
      notes: workout.notes ?? undefined,
      durationSeconds: workout.durationSeconds,
      title: workout.title ?? undefined,
      exercises: workout.exercises.map((item) => ({
        exerciseId: item.exerciseId,
        name: item.exerciseName,
        sets: item.sets.map((set) => ({
          reps: set.reps ?? undefined,
          weightKg: set.weightKg ?? undefined,
          durationSeconds: set.durationSeconds ?? undefined,
          distanceM: set.distanceM ?? undefined,
        })),
      })),
    });
    workout = (await service.workouts.getById(workout.id)) ?? workout;
  }

  const recentExercises = await service.workouts.recentExerciseTemplates();

  return {
    exercises,
    recentExercises,
    workoutId: workout.id,
    draft: service.workouts.toFormDraft(workout),
    seedEnergyBefore,
    timeZone,
  };
}

export function shouldRevalidate({
  formData,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  // Autosave must not re-run the loader (which used to re-create drafts).
  if (formData?.get("intent") === "autosave") return false;
  return defaultShouldRevalidate;
}

export async function action({ request }: Route.ActionArgs) {
  const { service, timeZone } = await requireMomentumService(request);
  const formData = await request.formData();
  const intent = getString(formData, "intent") || "complete";
  const workoutId = getString(formData, "workoutId");

  try {
    if (intent === "autosave") {
      if (!workoutId) {
        return { ok: true as const };
      }
      try {
        const input = parseDraftWorkoutFormData(formData, timeZone);
        await service.workouts.saveDraft(workoutId, input);
      } catch {
        // Draft may already be completed/discarded — ignore stale autosaves.
      }
      return { ok: true as const };
    }

    if (intent === "discard") {
      await service.workouts.discardInProgress(workoutId || undefined);
      throw redirect("/");
    }

    if (!workoutId) {
      return { error: "Missing workout." };
    }

    const input = parseWorkoutFormData(formData, timeZone);
    const workout = await service.workouts.completeDraft(workoutId, input);
    if (!workout) {
      return { error: "Could not save workout." };
    }
    throw redirect(`/workouts/${workout.id}`);
  } catch (error) {
    if (error instanceof Response) throw error;
    return {
      error: error instanceof Error ? error.message : "Could not save workout.",
    };
  }
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Log workout · Momentum" }];
}

export default function LogWorkoutPage() {
  const { exercises, recentExercises, draft, workoutId, seedEnergyBefore, timeZone } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <WorkoutLogForm
      autosave
      backLink="/"
      discardLabel="Discard workout"
      draft={draft}
      error={actionData && "error" in actionData ? actionData.error : null}
      exercises={exercises}
      heading="Log workout"
      recentExercises={recentExercises}
      seedEnergyBefore={seedEnergyBefore}
      submitLabel="Save workout"
      timeZone={timeZone}
      workoutId={workoutId}
    />
  );
}
