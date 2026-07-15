export type ExerciseMetric = "reps" | "weightKg" | "durationSeconds" | "distanceM";

const DEFAULT_METRICS: ExerciseMetric[] = ["reps", "weightKg", "durationSeconds"];

const METRICS_BY_KEY: Record<string, ExerciseMetric[]> = {
  "pull-up": ["reps", "weightKg"],
  "push-up": ["reps"],
  squat: ["reps", "weightKg"],
  deadlift: ["reps", "weightKg"],
  "bench-press": ["reps", "weightKg"],
  row: ["reps", "weightKg"],
  "overhead-press": ["reps", "weightKg"],
  run: ["durationSeconds", "distanceM"],
  "dead-hang": ["durationSeconds"],
  plank: ["durationSeconds"],
};

const METRIC_LABELS: Record<ExerciseMetric, string> = {
  reps: "Reps",
  weightKg: "kg",
  durationSeconds: "Sec",
  distanceM: "m",
};

export function metricsForExerciseKey(key?: string | null): ExerciseMetric[] {
  if (key && METRICS_BY_KEY[key]) return METRICS_BY_KEY[key];
  return DEFAULT_METRICS;
}

export function metricLabel(metric: ExerciseMetric) {
  return METRIC_LABELS[metric];
}

export function metricInputMode(metric: ExerciseMetric): "numeric" | "decimal" {
  return metric === "weightKg" || metric === "distanceM" ? "decimal" : "numeric";
}
