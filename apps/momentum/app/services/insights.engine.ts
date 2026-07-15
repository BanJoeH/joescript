import { calendarDaysBetween, getZonedParts } from "~/lib/dates";

export type InsightConfidence = "low" | "medium" | "high";

export type Insight = {
  id: string;
  title: string;
  summary: string;
  confidence: InsightConfidence;
  evidence: string;
  category: "training" | "body" | "habits";
  /** Higher = more useful for nudging the next workout. */
  activation: number;
};

type WorkoutInsightRow = {
  id: string;
  completedAt: Date | null;
  energyBefore: number | null;
  energyAfter: number | null;
  worthIt: number | null;
  durationSeconds: number | null;
};

type MeasurementInsightRow = {
  id: string;
  value: number;
  recordedAt: Date | null;
  typeKey: string;
  typeName: string;
  unit: string;
};

const DAY_NAMES = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
] as const;

const DAY_NAME_SINGULAR = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function generateInsights(
  workouts: WorkoutInsightRow[],
  measurements: MeasurementInsightRow[],
  now = new Date(),
  timeZone = "UTC",
): Insight[] {
  const insights: Insight[] = [];
  const completed = workouts.filter((w) => w.completedAt != null);

  pushEnergyLift(insights, completed);
  pushTiredStartBounce(insights, completed);
  pushWorthItEvenWhenTired(insights, completed);
  pushUsuallyWorthIt(insights, completed);
  pushShortSessionsWorthIt(insights, completed);
  pushNeverRegrettedShort(insights, completed);
  pushComebackWorthIt(insights, completed, timeZone);
  pushGapIsOkay(insights, completed, now, timeZone);
  pushPreferredDay(insights, completed, now, timeZone);
  pushTimeOfDay(insights, completed, now, timeZone);
  pullMeasurementInsights(insights, measurements);

  return insights.sort(
    (a, b) => b.activation - a.activation || b.confidence.localeCompare(a.confidence),
  );
}

function pushEnergyLift(insights: Insight[], workouts: WorkoutInsightRow[]) {
  const withEnergy = workouts.filter((w) => w.energyBefore != null && w.energyAfter != null);
  if (withEnergy.length < 4) return;

  const improved = withEnergy.filter((w) => (w.energyAfter ?? 0) > (w.energyBefore ?? 0));
  const rate = improved.length / withEnergy.length;
  if (rate < 0.5) return;

  const pct = Math.round(rate * 100);
  insights.push({
    id: "energy-after",
    title: "You usually feel better after training",
    summary: "Even on days that feel flat, finishing a session often leaves you with more energy.",
    confidence: pct >= 75 ? "high" : pct >= 60 ? "medium" : "low",
    evidence: `${improved.length} of your last ${withEnergy.length} workouts improved your energy.`,
    category: "training",
    activation: 90,
  });
}

function pushTiredStartBounce(insights: Insight[], workouts: WorkoutInsightRow[]) {
  const tiredStarts = workouts.filter(
    (w) => w.energyBefore != null && w.energyBefore <= 2 && w.energyAfter != null,
  );
  if (tiredStarts.length < 3) return;

  const bounced = tiredStarts.filter((w) => (w.energyAfter ?? 0) > (w.energyBefore ?? 0));
  const rate = bounced.length / tiredStarts.length;
  if (rate < 0.55) return;

  insights.push({
    id: "tired-start-bounce",
    title: "Starting tired still tends to help",
    summary:
      "When you begin with low energy, finishing the session often leaves you feeling better than when you started.",
    confidence: rate >= 0.75 ? "high" : "medium",
    evidence: `${bounced.length} of ${tiredStarts.length} low-energy starts ended with higher energy.`,
    category: "training",
    activation: 96,
  });
}

function pushWorthItEvenWhenTired(insights: Insight[], workouts: WorkoutInsightRow[]) {
  const tired = workouts.filter(
    (w) => w.energyBefore != null && w.energyBefore <= 2 && w.worthIt != null,
  );
  if (tired.length < 3) return;

  const worthIt = tired.filter((w) => (w.worthIt ?? 0) >= 4);
  const rate = worthIt.length / tired.length;
  if (rate < 0.55) return;

  insights.push({
    id: "worth-it-when-tired",
    title: "Low-motivation days still feel worth it",
    summary:
      "When you have started a workout feeling drained, you have still often rated it as worth doing.",
    confidence: rate >= 0.7 ? "high" : "medium",
    evidence: `${worthIt.length} of ${tired.length} tired starts scored 4 or 5 on worth it.`,
    category: "training",
    activation: 98,
  });
}

function pushUsuallyWorthIt(insights: Insight[], workouts: WorkoutInsightRow[]) {
  const withWorth = workouts.filter((w) => w.worthIt != null);
  if (withWorth.length < 4) return;

  const high = withWorth.filter((w) => (w.worthIt ?? 0) >= 4);
  const rate = high.length / withWorth.length;
  if (rate < 0.6) return;

  const neverLow = withWorth.every((w) => (w.worthIt ?? 0) >= 3);
  insights.push({
    id: "usually-worth-it",
    title: neverLow ? "You rarely regret showing up" : "Your workouts usually feel worth it",
    summary: neverLow
      ? "Looking at your history, training seldom ends in regret."
      : "Across recent sessions, satisfaction tends to land on the high side.",
    confidence: rate >= 0.8 ? "high" : "medium",
    evidence: `${high.length} of your last ${withWorth.length} workouts scored 4 or 5 on worth it.`,
    category: "training",
    activation: 88,
  });
}

function pushShortSessionsWorthIt(insights: Insight[], workouts: WorkoutInsightRow[]) {
  const withDuration = workouts.filter(
    (w) => w.durationSeconds != null && w.worthIt != null && w.durationSeconds > 0,
  );
  if (withDuration.length < 5) return;

  const short = withDuration.filter((w) => (w.durationSeconds ?? 0) < 20 * 60);
  const long = withDuration.filter((w) => (w.durationSeconds ?? 0) >= 20 * 60);
  if (short.length < 3 || long.length < 2) return;

  const shortAvg = avg(short.map((w) => w.worthIt ?? 0));
  const longAvg = avg(long.map((w) => w.worthIt ?? 0));
  if (shortAvg <= longAvg + 0.25) return;

  insights.push({
    id: "short-sessions",
    title: "Short sessions often feel more worth it",
    summary: "A brief workout can still land as one of your most satisfying choices.",
    confidence: short.length >= 5 ? "high" : "medium",
    evidence: `Average worth-it ${shortAvg.toFixed(1)} under 20 minutes vs ${longAvg.toFixed(1)} for longer sessions.`,
    category: "training",
    activation: 86,
  });
}

function pushNeverRegrettedShort(insights: Insight[], workouts: WorkoutInsightRow[]) {
  const short = workouts.filter(
    (w) =>
      w.durationSeconds != null &&
      w.durationSeconds > 0 &&
      w.durationSeconds < 20 * 60 &&
      w.worthIt != null,
  );
  if (short.length < 3) return;

  const regretted = short.filter((w) => (w.worthIt ?? 0) <= 2);
  if (regretted.length > 0) return;

  insights.push({
    id: "never-regretted-short",
    title: "Short workouts have never felt wasted",
    summary: "When time is tight, a short session has still shown up as worthwhile in your log.",
    confidence: short.length >= 5 ? "high" : "medium",
    evidence: `None of your ${short.length} workouts under 20 minutes scored below 3 on worth it.`,
    category: "training",
    activation: 94,
  });
}

function pushComebackWorthIt(insights: Insight[], workouts: WorkoutInsightRow[], timeZone: string) {
  const ordered = [...workouts]
    .filter((w) => w.completedAt != null)
    .sort((a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0));

  if (ordered.length < 3) return;

  const comebacks: WorkoutInsightRow[] = [];
  for (let i = 1; i < ordered.length; i += 1) {
    const prev = ordered[i - 1];
    const current = ordered[i];
    if (!prev?.completedAt || !current?.completedAt) continue;
    if (
      calendarDaysBetween(prev.completedAt, current.completedAt, timeZone) >= 5 &&
      current.worthIt != null
    ) {
      comebacks.push(current);
    }
  }

  if (comebacks.length < 2) return;

  const strong = comebacks.filter((w) => (w.worthIt ?? 0) >= 4);
  const rate = strong.length / comebacks.length;
  if (rate < 0.5) return;

  insights.push({
    id: "comeback-worth-it",
    title: "Coming back still feels worth it",
    summary: "After a longer gap, returning to training has often still felt like the right call.",
    confidence: rate >= 0.7 ? "high" : "medium",
    evidence: `${strong.length} of ${comebacks.length} return sessions after 5+ days scored 4 or 5 on worth it.`,
    category: "habits",
    activation: 92,
  });
}

function pushGapIsOkay(
  insights: Insight[],
  workouts: WorkoutInsightRow[],
  now: Date,
  timeZone: string,
) {
  const latest = [...workouts]
    .filter((w) => w.completedAt != null)
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0];

  if (!latest?.completedAt || latest.worthIt == null) return;

  const gap = calendarDaysBetween(latest.completedAt, now, timeZone);
  if (gap < 3 || gap > 21) return;
  if ((latest.worthIt ?? 0) < 4) return;

  insights.push({
    id: "welcome-back-gap",
    title: "Your last session still felt worth it",
    summary:
      gap === 1
        ? "Yesterday's workout landed well. Another one can be just as straightforward."
        : `It has been ${gap} days. Your most recent session still scored high on worth it.`,
    confidence: "medium",
    evidence: `Last workout was ${formatRelativeGap(gap)} and scored ${latest.worthIt} on worth it.`,
    category: "habits",
    activation: 85,
  });
}

function formatRelativeGap(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function pushPreferredDay(
  insights: Insight[],
  workouts: WorkoutInsightRow[],
  now: Date,
  timeZone: string,
) {
  const byDay = new Map<number, number>();
  for (const w of workouts) {
    if (!w.completedAt) continue;
    const day = getZonedParts(w.completedAt, timeZone).weekday;
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  if (workouts.length < 6 || byDay.size === 0) return;

  let bestDay = 0;
  let bestCount = 0;
  for (const [day, count] of byDay) {
    if (count > bestCount) {
      bestDay = day;
      bestCount = count;
    }
  }

  if (bestCount < 3 || bestCount / workouts.length < 0.28) return;

  const isToday = getZonedParts(now, timeZone).weekday === bestDay;
  insights.push({
    id: "day-consistency",
    title: isToday
      ? `${DAY_NAME_SINGULAR[bestDay]} often works for you`
      : `You tend to train more on ${DAY_NAMES[bestDay]}`,
    summary: isToday
      ? "Today matches a day that shows up a lot in your history. A session may feel familiar."
      : "A quiet weekday pattern appears in your log.",
    confidence: bestCount / workouts.length >= 0.4 ? "high" : "medium",
    evidence: `${bestCount} of your last ${workouts.length} workouts landed on ${DAY_NAMES[bestDay]}.`,
    category: "habits",
    activation: isToday ? 93 : 72,
  });
}

function pushTimeOfDay(
  insights: Insight[],
  workouts: WorkoutInsightRow[],
  now: Date,
  timeZone: string,
) {
  const withTime = workouts.filter(
    (w): w is WorkoutInsightRow & { completedAt: Date; worthIt: number } =>
      w.completedAt != null && w.worthIt != null,
  );
  if (withTime.length < 6) return;

  const buckets = {
    morning: withTime.filter((w) => {
      const hour = getZonedParts(w.completedAt, timeZone).hour;
      return hour >= 5 && hour < 12;
    }),
    afternoon: withTime.filter((w) => {
      const hour = getZonedParts(w.completedAt, timeZone).hour;
      return hour >= 12 && hour < 17;
    }),
    evening: withTime.filter((w) => {
      const hour = getZonedParts(w.completedAt, timeZone).hour;
      return hour >= 17 && hour < 22;
    }),
  };

  const scored = (
    Object.entries(buckets) as Array<["morning" | "afternoon" | "evening", typeof withTime]>
  )
    .filter(([, rows]) => rows.length >= 3)
    .map(([label, rows]) => ({
      label,
      rows,
      avgWorth: avg(rows.map((w) => w.worthIt)),
    }))
    .sort((a, b) => b.avgWorth - a.avgWorth);

  const best = scored[0];
  const second = scored[1];
  if (!best || best.avgWorth < 3.5) return;
  if (second && best.avgWorth < second.avgWorth + 0.3) return;

  const hour = getZonedParts(now, timeZone).hour;
  const currentBucket =
    hour >= 5 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 17
        ? "afternoon"
        : hour >= 17 && hour < 22
          ? "evening"
          : null;
  const matchesNow = currentBucket === best.label;

  const labelCopy = {
    morning: "mornings",
    afternoon: "afternoons",
    evening: "evenings",
  } as const;

  insights.push({
    id: "time-of-day",
    title: matchesNow
      ? `This time of day often feels good for you`
      : `Your ${labelCopy[best.label]} sessions tend to land well`,
    summary: matchesNow
      ? `You are in a ${best.label} window, and those sessions often score highly on worth it.`
      : `${capitalize(best.label)} workouts show up as some of your more satisfying ones.`,
    confidence: best.rows.length >= 5 ? "high" : "medium",
    evidence: `${best.rows.length} ${best.label} workouts average ${best.avgWorth.toFixed(1)} on worth it.`,
    category: "habits",
    activation: matchesNow ? 91 : 70,
  });
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pullMeasurementInsights(insights: Insight[], measurements: MeasurementInsightRow[]) {
  const pullUps = measurements
    .filter((m) => m.typeKey === "max_pull_ups")
    .sort((a, b) => (a.recordedAt?.getTime() ?? 0) - (b.recordedAt?.getTime() ?? 0));
  if (pullUps.length >= 2) {
    const first = pullUps[0];
    const last = pullUps[pullUps.length - 1];
    if (!first || !last) return;
    if (last.value > first.value) {
      insights.push({
        id: "pull-up-progress",
        title: "Your pull-ups appear to be improving",
        summary: "Quiet progress on the bar is showing up in your check-ins.",
        confidence: pullUps.length >= 4 ? "high" : "medium",
        evidence: `Max pull-ups moved from ${first.value} to ${last.value} across ${pullUps.length} check-ins.`,
        category: "body",
        activation: 65,
      });
    }
  }

  const weight = measurements
    .filter((m) => m.typeKey === "weight" || m.typeKey === "bodyweight")
    .sort((a, b) => (a.recordedAt?.getTime() ?? 0) - (b.recordedAt?.getTime() ?? 0));
  if (weight.length >= 3) {
    const first = weight[0];
    const last = weight[weight.length - 1];
    if (!first || !last) return;
    const delta = last.value - first.value;
    if (Math.abs(delta) >= 0.5) {
      insights.push({
        id: "weight-trend",
        title:
          delta < 0
            ? "Body weight seems to be trending down"
            : "Body weight seems to be trending up",
        summary: "A gentle pattern appears across your recent weigh-ins.",
        confidence: "low",
        evidence: `${first.typeName} moved from ${first.value}${first.unit} to ${last.value}${last.unit}.`,
        category: "body",
        activation: 40,
      });
    }
  }
}

export function createInsightsService() {
  return {
    generate: generateInsights,
  };
}
