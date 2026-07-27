import { Star } from "lucide-react";
import { Link, redirect, useActionData, useLoaderData } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { EnergyChangeBadge } from "~/components/energy-change";
import { LandscapeHero } from "~/components/landscape-hero";
import { Button } from "~/components/ui/button";
import { formatDateTime } from "~/lib/dates";
import { formatExerciseSetsSummary, groupWorkoutByRounds } from "~/lib/exercise-format";
import { getString } from "~/lib/forms.server";
import { cn } from "~/lib/utils";
import { requireMomentumService } from "~/services";

import type { Route } from "./+types/workouts.$workoutId";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { service, timeZone } = await requireMomentumService(request);
  const workout = await service.workouts.getById(params.workoutId);
  if (!workout) {
    throw new Response("Not found", { status: 404 });
  }
  const inProgress = await service.workouts.getInProgress();
  return {
    workout,
    timeZone,
    hasInProgress: Boolean(inProgress),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { service } = await requireMomentumService(request);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "delete") {
    try {
      const deleted = await service.workouts.remove(params.workoutId);
      if (!deleted) {
        return { error: "Workout not found." };
      }
      throw redirect("/workouts");
    } catch (error) {
      if (error instanceof Response) throw error;
      return {
        error: error instanceof Error ? error.message : "Could not delete workout.",
      };
    }
  }

  return { error: "Unknown action." };
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Workout · Momentum" }];
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Red → green tone for worth-it scores 1–5. */
function worthItTone(value: number | null | undefined) {
  switch (value) {
    case 1:
      return "border-destructive/35 bg-destructive/10 text-destructive";
    case 2:
      return "border-[#c9783a]/40 bg-[#c9783a]/10 text-[#c9783a]";
    case 3:
      return "border-amber/40 bg-amber-soft text-amber";
    case 4:
      return "border-[#378354]/40 bg-[#378354]/10 text-[#378354] dark:border-[#91c86a]/40 dark:bg-[#91c86a]/10 dark:text-[#91c86a]";
    case 5:
      return "border-primary/40 bg-primary-soft text-primary";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export default function WorkoutDetailPage() {
  const { workout, timeZone, hasInProgress } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const setCount = workout.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const duration = formatDuration(workout.durationSeconds);
  const canRepeat = workout.status === "completed";
  const rounds = groupWorkoutByRounds(workout.exercises);
  const roundCount = rounds?.length ?? 0;
  const metaParts = [
    duration,
    rounds ? `${roundCount} round${roundCount === 1 ? "" : "s"}` : `${setCount} sets`,
    `${workout.exercises.length} exercises`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        <Link className="hover:text-foreground" to="/workouts">
          Workouts
        </Link>
        {" / "}
        Detail
      </p>

      <LandscapeHero className="h-36 w-full" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{workout.title ?? "Workout"}</h1>
          <p className="text-sm text-muted-foreground">
            {workout.completedAt ? formatDateTime(workout.completedAt, timeZone) : "Recently"}
          </p>
          <p className="text-sm text-muted-foreground">{metaParts.join(" · ")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={`/workouts/${workout.id}/edit`}>Edit</Link>
          </Button>
          <DeleteForm confirmMessage="Delete this workout? This cannot be undone." />
        </div>
      </div>

      {canRepeat ? (
        <Button asChild className="btn-primary-gradient w-full">
          <Link
            onClick={(event) => {
              if (
                hasInProgress &&
                !window.confirm("Replace your in-progress workout with this one?")
              ) {
                event.preventDefault();
              }
            }}
            to={`/workouts/log?repeat=${workout.id}`}
          >
            Do this workout again
          </Link>
        </Button>
      ) : null}

      {actionData?.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionData.error}
        </p>
      ) : null}

      <h2 className="mb-2 text-md font-extrabold ">How did it feel?</h2>
      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mt-3 space-y-2 text-sm">
            <h3 className="mb-2 text-l font-extrabold text-muted-foreground">Energy</h3>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-3xl font-semibold">
                  {workout.energyBefore} → {workout.energyAfter}
                </p>
              </div>
              <EnergyChangeBadge after={workout.energyAfter} before={workout.energyBefore} />
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mt-3 space-y-2 text-sm">
            <h3 className="mb-2 text-l font-extrabold text-muted-foreground">Worth it?</h3>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-semibold">{workout.worthIt} / 5</span>
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border",
                  worthItTone(workout.worthIt),
                )}
              >
                <Star absoluteStrokeWidth className="size-5 fill-current" strokeWidth={1.75} />
              </span>
            </div>
          </div>
        </section>
      </div>

      {rounds ? (
        <section className="space-y-3">
          <h2 className="mb-2 text-md font-extrabold ">Rounds</h2>
          <ul className="space-y-3">
            {rounds.map((group) => (
              <li
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
                key={group.round}
              >
                <div className="border-b border-border px-4 py-2.5">
                  <h3 className="font-semibold tracking-tight">Round {group.round}</h3>
                </div>
                <ul className="divide-y divide-border">
                  {group.stations.map((station) => (
                    <li
                      className="flex items-baseline justify-between gap-3 px-4 py-3"
                      key={station.name}
                    >
                      <span className="font-medium">{station.name}</span>
                      <span className="text-sm text-muted-foreground">{station.details}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="mb-2 text-md font-extrabold ">Exercises</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {workout.exercises.map((item) => (
              <li className="px-4 py-3.5" key={item.id}>
                <h3 className="font-semibold">{item.exerciseName}</h3>
                {item.notes ? <p className="text-sm text-muted-foreground">{item.notes}</p> : null}
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatExerciseSetsSummary(item.sets)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
