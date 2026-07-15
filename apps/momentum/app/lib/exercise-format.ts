export type SetMetrics = {
  reps?: number | string | null;
  weightKg?: number | string | null;
  durationSeconds?: number | string | null;
  distanceM?: number | string | null;
};

function hasMetric(value: number | string | null | undefined): value is number | string {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function formatMetricValue(value: number | string) {
  return typeof value === "string" ? value.trim() : String(value);
}

/** Single set: e.g. "8 reps, 60 kg" */
export function formatSetDetails(set: SetMetrics) {
  return [
    hasMetric(set.reps) ? `${formatMetricValue(set.reps)} reps` : null,
    hasMetric(set.weightKg) ? `${formatMetricValue(set.weightKg)} kg` : null,
    hasMetric(set.durationSeconds) ? `${formatMetricValue(set.durationSeconds)}s` : null,
    hasMetric(set.distanceM) ? `${formatMetricValue(set.distanceM)} m` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Exercise summary line: e.g. "3 Sets · 8 reps, 60 kg · 8 reps, 60 kg · 6 reps, 65 kg"
 * Only sets with at least one metric are counted and listed.
 */
export function formatExerciseSetsSummary(sets: SetMetrics[]) {
  const details = sets.map(formatSetDetails).filter(Boolean);
  if (details.length === 0) return "No sets yet";

  const countLabel = `${details.length} Set${details.length === 1 ? "" : "s"}`;
  return `${countLabel} · ${details.join(" · ")}`;
}
