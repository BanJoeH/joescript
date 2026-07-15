import { Form, redirect, useActionData, useLoaderData, useSearchParams } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { SparklineChart } from "~/components/sparkline-chart";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import {
  addZonedDays,
  endOfZonedDay,
  formatDate,
  formatDateInput,
  parseDateInput,
  resolvePerformedAtForCreate,
  startOfZonedDay,
} from "~/lib/dates";
import { getOptionalString, getString } from "~/lib/forms.server";
import { requireMomentumService } from "~/services";

import type { Route } from "./+types/progress";

const TIMEFRAMES = [
  { key: "7d", label: "Past week", days: 7 },
  { key: "30d", label: "Past month", days: 30 },
  { key: "90d", label: "Past 3 months", days: 90 },
  { key: "365d", label: "Past year", days: 365 },
  { key: "all", label: "All time", days: null },
] as const;

type TimeframeKey = (typeof TIMEFRAMES)[number]["key"];

function parseTimeframe(value: string | null): TimeframeKey {
  if (TIMEFRAMES.some((frame) => frame.key === value)) {
    return value as TimeframeKey;
  }
  return "90d";
}

function timeframeCutoff(key: TimeframeKey, timeZone: string) {
  const frame = TIMEFRAMES.find((item) => item.key === key) ?? TIMEFRAMES[0];
  if (frame.days == null) return null;
  return addZonedDays(startOfZonedDay(new Date(), timeZone), -frame.days, timeZone);
}

function formatMeasurementValue(value: number, unit: string) {
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${formatted} ${unit}`;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { service, timeZone } = await requireMomentumService(request);
  const url = new URL(request.url);
  const types = await service.measurements.listTypes();
  const typeKey = url.searchParams.get("type") ?? types[0]?.key ?? "weight";
  const timeframe = parseTimeframe(url.searchParams.get("range"));
  const selected = types.find((t) => t.key === typeKey) ?? types[0];
  const series = selected ? await service.measurements.series(selected.id) : [];
  const cutoff = timeframeCutoff(timeframe, timeZone);
  const filteredSeries = cutoff
    ? series.filter((point) => point.recordedAt != null && point.recordedAt >= cutoff)
    : series;

  return {
    types,
    selected,
    series: filteredSeries,
    timeframe,
    timeZone,
    rangeFrom: cutoff?.toISOString() ?? null,
    rangeTo: new Date().toISOString(),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { service, timeZone } = await requireMomentumService(request);
  const formData = await request.formData();
  const intent = getString(formData, "intent") || "create";
  const url = new URL(request.url);

  if (intent === "delete") {
    try {
      const deleted = await service.measurements.remove(getString(formData, "id"));
      if (!deleted) {
        return { error: "Measurement not found." };
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not delete measurement.",
      };
    }
    throw redirect(`${url.pathname}${url.search}`);
  }

  try {
    const recordedAtRaw = getOptionalString(formData, "recordedAt");
    const recordedAt = recordedAtRaw ? parseDateInput(recordedAtRaw, timeZone) : new Date();
    if (!recordedAt) {
      return { error: "Invalid date." };
    }

    if (recordedAt > endOfZonedDay(new Date(), timeZone)) {
      return { error: "Measurement date can’t be in the future." };
    }

    await service.measurements.create({
      measurementTypeId: getString(formData, "measurementTypeId"),
      value: Number(getString(formData, "value")),
      recordedAt: resolvePerformedAtForCreate(recordedAt, timeZone),
      notes: getOptionalString(formData, "notes"),
    });

    throw redirect(`${url.pathname}${url.search}`);
  } catch (error) {
    if (error instanceof Response) throw error;
    return {
      error: error instanceof Error ? error.message : "Could not save measurement.",
    };
  }
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Progress · Momentum" }];
}

export default function ProgressPage() {
  const { types, selected, series, timeframe, timeZone, rangeFrom, rangeTo } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
  }

  const entries = [...series].sort((a, b) => {
    const aTime = a.recordedAt?.getTime() ?? 0;
    const bTime = b.recordedAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  const view = searchParams.get("view") === "list" ? "list" : "graph";
  const todayInput = formatDateInput(new Date(), timeZone);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">Objective measurements over time.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {types.map((type) => {
          const active = selected?.id === type.id;
          return (
            <button
              className={
                active
                  ? "rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  : "rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground"
              }
              key={type.id}
              onClick={() => updateParam("type", type.key)}
              type="button"
            >
              {type.name}
            </button>
          );
        })}
      </div>

      {selected ? (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <span className="text-sm text-muted-foreground">{selected.unit}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-border p-0.5">
                {(
                  [
                    { key: "graph", label: "Graph" },
                    { key: "list", label: "List" },
                  ] as const
                ).map((tab) => {
                  const active = view === tab.key;
                  return (
                    <button
                      className={
                        active
                          ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                          : "rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
                      }
                      key={tab.key}
                      onClick={() => updateParam("view", tab.key)}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <Label className="sr-only" htmlFor="timeframe">
                Timeframe
              </Label>
              <Select
                className="h-9 w-auto min-w-[9.5rem] border-border bg-background text-sm"
                id="timeframe"
                onChange={(event) => updateParam("range", event.target.value)}
                value={timeframe}
              >
                {TIMEFRAMES.map((frame) => (
                  <option key={frame.key} value={frame.key}>
                    {frame.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {view === "graph" ? (
            <SparklineChart
              from={rangeFrom ? new Date(rangeFrom) : undefined}
              points={series
                .filter(
                  (point): point is typeof point & { recordedAt: Date } => point.recordedAt != null,
                )
                .map((point) => ({
                  value: point.value,
                  at: point.recordedAt,
                }))}
              timeZone={timeZone}
              to={timeframe === "all" ? undefined : new Date(rangeTo)}
              unit={selected.unit}
            />
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries in this timeframe.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {entries.map((entry) => (
                <li
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  key={entry.id}
                >
                  <div>
                    <p className="font-medium">
                      {formatMeasurementValue(entry.value, selected.unit)}
                    </p>
                    <p className="text-muted-foreground">
                      {entry.recordedAt ? formatDate(entry.recordedAt, timeZone) : "Unknown date"}
                    </p>
                    {entry.notes ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{entry.notes}</p>
                    ) : null}
                  </div>
                  <DeleteForm
                    confirmMessage="Delete this measurement?"
                    hiddenFields={{ id: entry.id }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-lg font-semibold">Add measurement</h2>
        {actionData?.error ? (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {actionData.error}
          </p>
        ) : null}
        <Form className="mt-4 space-y-4" method="post">
          <input name="intent" type="hidden" value="create" />
          <div className="space-y-2">
            <Label htmlFor="measurementTypeId">Type</Label>
            <Select
              defaultValue={selected?.id}
              id="measurementTypeId"
              name="measurementTypeId"
              required
            >
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.unit})
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                inputMode="decimal"
                name="value"
                required
                step="any"
                type="number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recordedAt">Date</Label>
              <Input
                defaultValue={todayInput}
                id="recordedAt"
                max={todayInput}
                name="recordedAt"
                type="date"
              />
            </div>
          </div>
          <Button className="btn-primary-gradient" type="submit">
            Save measurement
          </Button>
        </Form>
      </section>
    </div>
  );
}
