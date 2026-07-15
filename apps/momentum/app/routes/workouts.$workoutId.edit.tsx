import { redirect, useActionData, useLoaderData } from "react-router";

import { WorkoutLogForm } from "~/components/workout-log-form";
import { parseWorkoutFormData } from "~/lib/workout-form.server";
import { requireMomentumService } from "~/services";

import type { Route } from "./+types/workouts.$workoutId.edit";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { service, timeZone } = await requireMomentumService(request);
  const workout = await service.workouts.getById(params.workoutId);
  const exercises = await service.exercises.list();

  if (!workout) {
    throw new Response("Not found", { status: 404 });
  }

  return {
    exercises,
    workoutId: workout.id,
    timeZone,
    draft: {
      title: workout.title ?? undefined,
      energyBefore: workout.energyBefore,
      energyAfter: workout.energyAfter,
      worthIt: workout.worthIt,
      notes: workout.notes,
      durationSeconds: workout.durationSeconds,
      completedAt: workout.completedAt ?? workout.startedAt,
      exercises: workout.exercises.map((item) => ({
        exerciseId: item.exerciseId,
        name: item.exerciseName,
        key: item.exerciseKey,
        sets: item.sets.map((set) => ({
          reps: set.reps,
          weightKg: set.weightKg,
          durationSeconds: set.durationSeconds,
          distanceM: set.distanceM,
        })),
      })),
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { service, timeZone } = await requireMomentumService(request);
  const formData = await request.formData();

  try {
    const existing = await service.workouts.getById(params.workoutId);
    const input = parseWorkoutFormData(formData, timeZone, {
      existingCompletedAt: existing?.completedAt,
    });
    const workout = await service.workouts.update(params.workoutId, input);
    if (!workout) {
      return { error: "Could not update workout." };
    }
    throw redirect(`/workouts/${workout.id}`);
  } catch (error) {
    if (error instanceof Response) throw error;
    return {
      error: error instanceof Error ? error.message : "Could not update workout.",
    };
  }
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit workout · Momentum" }];
}

export default function EditWorkoutPage() {
  const { exercises, draft, workoutId, timeZone } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <WorkoutLogForm
      backLink={`/workouts/${workoutId}`}
      draft={draft}
      error={actionData?.error}
      exercises={exercises}
      heading="Edit workout"
      submitLabel="Save changes"
      timeZone={timeZone}
    />
  );
}
