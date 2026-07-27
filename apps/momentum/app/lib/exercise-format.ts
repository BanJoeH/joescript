export type SetMetrics = {
  reps?: number | string | null;
  weightKg?: number | string | null;
  durationSeconds?: number | string | null;
  distanceM?: number | string | null;
  roundNumber?: number | null;
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
 * Exercise summary line: e.g. "3 Sets · 8 reps, 60 kg · …"
 * Circuit sets with roundNumber show as "3 rounds · R1: … · R2: …"
 */
export function formatExerciseSetsSummary(sets: SetMetrics[]) {
  const valued = sets.filter(
    (set) =>
      hasMetric(set.reps) ||
      hasMetric(set.weightKg) ||
      hasMetric(set.durationSeconds) ||
      hasMetric(set.distanceM),
  );
  if (valued.length === 0) return "No sets yet";

  const withRounds = valued.filter((set) => set.roundNumber != null);
  if (withRounds.length > 0) {
    const sorted = [...withRounds].sort((a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0));
    const countLabel = `${sorted.length} round${sorted.length === 1 ? "" : "s"}`;
    return `${countLabel} · ${sorted
      .map((set) => `R${set.roundNumber}: ${formatSetDetails(set) || "—"}`)
      .join(" · ")}`;
  }

  const details = valued.map(formatSetDetails).filter(Boolean);
  const countLabel = `${details.length} Set${details.length === 1 ? "" : "s"}`;
  return `${countLabel} · ${details.join(" · ")}`;
}

export function groupWorkoutByRounds<
  T extends {
    exerciseName: string;
    sets: Array<SetMetrics & { id?: string }>;
  },
>(exercises: T[]) {
  const roundNumbers = new Set<number>();
  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      if (set.roundNumber != null) roundNumbers.add(set.roundNumber);
    }
  }
  if (roundNumbers.size === 0) return null;

  return [...roundNumbers]
    .sort((a, b) => a - b)
    .map((round) => ({
      round,
      stations: exercises
        .map((exercise) => {
          const set = exercise.sets.find((item) => item.roundNumber === round);
          if (!set) return null;
          const details = formatSetDetails(set);
          if (!details) return null;
          return { name: exercise.exerciseName, details };
        })
        .filter((item): item is { name: string; details: string } => item != null),
    }))
    .filter((group) => group.stations.length > 0);
}
