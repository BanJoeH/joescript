import type { ShouldRevalidateFunctionArgs } from "react-router";
import { redirect, useActionData, useLoaderData } from "react-router";

import { WorkoutLogForm } from "~/components/workout-log-form";
import { getString } from "~/lib/forms.server";
import { parseDraftWorkoutFormData, parseWorkoutFormData } from "~/lib/workout-form.server";
import { requireMomentumService } from "~/services";

import type { Route } from "./+types/workouts.log";

export async function loader({ request }: Route.LoaderArgs) {
  const { service } = await requireMomentumService(request);
  const url = new URL(request.url);
  const repeat = url.searchParams.get("repeat") === "1";
  // Only create a draft when intentionally starting (avoids revalidation races
  // after complete/autosave leaving a fresh empty "Continue Workout").
  const start = url.searchParams.get("start") === "1" || repeat;

  // libsql web client is not safe for concurrent queries on one connection.
  const exercises = await service.exercises.list();
  let workout = await service.workouts.getInProgress();

  if (!workout) {
    if (!start) {
      throw redirect("/");
    }
    workout = await service.workouts.ensureInProgress();
    if (!workout) {
      throw new Error("Could not start workout.");
    }
    if (repeat) {
      const template = await service.workouts.repeatLatest().catch(() => null);
      if (template) {
        await service.workouts.saveDraft(workout.id, {
          title: template.title,
          exercises: template.exercises,
        });
        workout = (await service.workouts.getById(workout.id)) ?? workout;
      }
    }
  }

  return {
    exercises,
    workoutId: workout.id,
    draft: service.workouts.toFormDraft(workout),
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
  const { service } = await requireMomentumService(request);
  const formData = await request.formData();
  const intent = getString(formData, "intent") || "complete";
  const workoutId = getString(formData, "workoutId");

  try {
    if (intent === "autosave") {
      if (!workoutId) {
        return { ok: true as const };
      }
      try {
        const input = parseDraftWorkoutFormData(formData);
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

    const input = parseWorkoutFormData(formData);
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
  const { exercises, draft, workoutId } = useLoaderData<typeof loader>();
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
      submitLabel="Save workout"
      workoutId={workoutId}
    />
  );
}
