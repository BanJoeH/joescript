import { Link, useLoaderData } from "react-router";

import { formatEnergyLabel, formatWorthItLabel } from "~/components/rating-picker";
import { formatDate } from "~/lib/dates";
import { requireMomentumService } from "~/services";

import type { Route } from "./+types/workouts";

export async function loader({ request }: Route.LoaderArgs) {
  const { service, timeZone } = await requireMomentumService(request);
  return { workouts: await service.workouts.list(), timeZone };
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Workouts · Momentum" }];
}

export default function WorkoutsPage() {
  const { workouts, timeZone } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workouts</h1>
          <p className="text-sm text-muted-foreground">
            Your journal of sessions and how they felt.
          </p>
        </div>
        <Link className="text-sm font-medium text-primary" to="/workouts/log?start=1">
          Log
        </Link>
      </div>

      {workouts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Nothing logged yet. Start with a short session whenever you are ready.
        </div>
      ) : (
        <ul className="space-y-3">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <Link
                className="block rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/40"
                to={`/workouts/${workout.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{workout.title ?? "Workout"}</h2>
                    <p className="text-sm text-muted-foreground">
                      {workout.completedAt
                        ? formatDate(workout.completedAt, timeZone)
                        : "In progress"}
                    </p>
                  </div>
                  {workout.worthIt != null ? (
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs text-primary">
                      {formatWorthItLabel(workout.worthIt)}
                    </span>
                  ) : null}
                </div>
                {workout.energyBefore != null && workout.energyAfter != null ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Energy {formatEnergyLabel(workout.energyBefore)} →{" "}
                    {formatEnergyLabel(workout.energyAfter)}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
