import { useLoaderData, useSearchParams } from "react-router";

import { InsightCard } from "~/components/insight-card";
import { requireMomentumService } from "~/services";
import type { Insight } from "~/services/insights.engine";

import type { Route } from "./+types/insights";

export async function loader({ request }: Route.LoaderArgs) {
  const { service } = await requireMomentumService(request);
  return { insights: await service.insights() };
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Insights · Momentum" }];
}

const filters = [
  { key: "all", label: "All" },
  { key: "training", label: "Training" },
  { key: "body", label: "Body" },
  { key: "habits", label: "Habits" },
] as const;

export default function InsightsPage() {
  const { insights } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get("filter") ?? "all") as Insight["category"] | "all";

  const visible =
    filter === "all" ? insights : insights.filter((insight) => insight.category === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Careful observations from your own history, never invented motivation.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => {
          const active = filter === item.key;
          return (
            <button
              className={
                active
                  ? "rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  : "rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground"
              }
              key={item.key}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                if (item.key === "all") next.delete("filter");
                else next.set("filter", item.key);
                setSearchParams(next);
              }}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Insights start sparse. Keep logging workouts and measurements; patterns will show up
          quietly.
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((insight) => (
            <li key={insight.id}>
              <InsightCard insight={insight} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
