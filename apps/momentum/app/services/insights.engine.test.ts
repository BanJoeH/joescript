import { describe, expect, it } from "vitest";

import { generateInsights } from "~/services/insights.engine";

function workout(
  overrides: Partial<{
    id: string;
    completedAt: Date;
    energyBefore: number;
    energyAfter: number;
    worthIt: number;
    durationSeconds: number;
  }>,
) {
  return {
    id: overrides.id ?? "w",
    completedAt: overrides.completedAt ?? new Date(2026, 0, 1),
    energyBefore: overrides.energyBefore ?? 3,
    energyAfter: overrides.energyAfter ?? 4,
    worthIt: overrides.worthIt ?? 4,
    durationSeconds: overrides.durationSeconds ?? 25 * 60,
  };
}

describe("generateInsights", () => {
  it("returns energy insight when most workouts improve energy", () => {
    const workouts = Array.from({ length: 8 }, (_, i) =>
      workout({
        id: `w-${i}`,
        completedAt: new Date(2026, 0, i + 1),
        energyBefore: 2,
        energyAfter: 4,
      }),
    );

    const insights = generateInsights(workouts, []);
    expect(insights.some((insight) => insight.id === "energy-after")).toBe(true);
  });

  it("surfaces tired-start bounce insights for activation", () => {
    const workouts = Array.from({ length: 5 }, (_, i) =>
      workout({
        id: `w-${i}`,
        completedAt: new Date(2026, 0, i + 1),
        energyBefore: 2,
        energyAfter: 4,
        worthIt: 5,
      }),
    );

    const insights = generateInsights(workouts, []);
    expect(insights.some((insight) => insight.id === "tired-start-bounce")).toBe(true);
    expect(insights.some((insight) => insight.id === "worth-it-when-tired")).toBe(true);
  });

  it("surfaces never-regretted short workouts", () => {
    const workouts = Array.from({ length: 4 }, (_, i) =>
      workout({
        id: `w-${i}`,
        completedAt: new Date(2026, 0, i + 1),
        durationSeconds: 15 * 60,
        worthIt: 4,
      }),
    );

    const insights = generateInsights(workouts, []);
    expect(insights.some((insight) => insight.id === "never-regretted-short")).toBe(true);
  });

  it("ranks activation insights ahead of body trends", () => {
    const workouts = Array.from({ length: 6 }, (_, i) =>
      workout({
        id: `w-${i}`,
        completedAt: new Date(2026, 0, i + 1),
        energyBefore: 2,
        energyAfter: 5,
        worthIt: 5,
      }),
    );
    const measurements = [
      {
        id: "m1",
        value: 80,
        recordedAt: new Date("2026-01-01"),
        typeKey: "weight",
        typeName: "Weight",
        unit: "kg",
      },
      {
        id: "m2",
        value: 79,
        recordedAt: new Date("2026-01-08"),
        typeKey: "weight",
        typeName: "Weight",
        unit: "kg",
      },
      {
        id: "m3",
        value: 78,
        recordedAt: new Date("2026-01-15"),
        typeKey: "weight",
        typeName: "Weight",
        unit: "kg",
      },
    ];

    const insights = generateInsights(workouts, measurements);
    expect(insights[0]?.category).toBe("training");
    expect(insights[0]?.activation ?? 0).toBeGreaterThan(
      insights.find((insight) => insight.id === "weight-trend")?.activation ?? 0,
    );
  });

  it("returns pull-up progress insight", () => {
    const measurements = [
      {
        id: "m1",
        value: 1,
        recordedAt: new Date("2026-01-01"),
        typeKey: "max_pull_ups",
        typeName: "Max pull-ups",
        unit: "reps",
      },
      {
        id: "m2",
        value: 4,
        recordedAt: new Date("2026-02-01"),
        typeKey: "max_pull_ups",
        typeName: "Max pull-ups",
        unit: "reps",
      },
    ];

    const insights = generateInsights([], measurements);
    expect(insights.some((insight) => insight.id === "pull-up-progress")).toBe(true);
  });

  it("returns empty when there is not enough history", () => {
    expect(generateInsights([], [])).toEqual([]);
  });

  it("boosts preferred-day insight when today matches", () => {
    const tuesday = new Date(2026, 0, 6, 10); // Tuesday in local test TZ
    const workouts = Array.from({ length: 8 }, (_, i) =>
      workout({
        id: `w-${i}`,
        completedAt: new Date(2026, 0, 6 + i * 7, 10),
        worthIt: 4,
      }),
    );

    // Use the runtime's local zone so constructed Dates match weekday expectations.
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const insights = generateInsights(workouts, [], tuesday, timeZone);
    const dayInsight = insights.find((insight) => insight.id === "day-consistency");
    expect(dayInsight?.title).toContain("Tuesday");
    expect(dayInsight?.activation).toBeGreaterThanOrEqual(90);
  });
});
