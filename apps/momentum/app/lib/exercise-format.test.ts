import { describe, expect, it } from "vitest";

import {
  formatExerciseSetsSummary,
  groupWorkoutByRounds,
} from "~/lib/exercise-format";

describe("formatExerciseSetsSummary", () => {
  it("summarises straight sets", () => {
    expect(
      formatExerciseSetsSummary([
        { reps: 8, weightKg: 60 },
        { reps: 6, weightKg: 65 },
      ]),
    ).toBe("2 Sets · 8 reps, 60 kg · 6 reps, 65 kg");
  });

  it("summarises circuit rounds", () => {
    expect(
      formatExerciseSetsSummary([
        { reps: 8, roundNumber: 1 },
        { reps: 7, roundNumber: 2 },
      ]),
    ).toBe("2 rounds · R1: 8 reps · R2: 7 reps");
  });
});

describe("groupWorkoutByRounds", () => {
  it("returns null when no round numbers", () => {
    expect(
      groupWorkoutByRounds([
        { exerciseName: "Squat", sets: [{ reps: 5, weightKg: 80 }] },
      ]),
    ).toBeNull();
  });

  it("groups stations by round", () => {
    const groups = groupWorkoutByRounds([
      {
        exerciseName: "Pull-up",
        sets: [
          { reps: 8, roundNumber: 1 },
          { reps: 7, roundNumber: 2 },
        ],
      },
      {
        exerciseName: "Push-up",
        sets: [
          { reps: 15, roundNumber: 1 },
          { reps: 12, roundNumber: 2 },
        ],
      },
      {
        exerciseName: "Plank",
        sets: [{ durationSeconds: 45, roundNumber: 1 }],
      },
    ]);

    expect(groups).toEqual([
      {
        round: 1,
        stations: [
          { name: "Pull-up", details: "8 reps" },
          { name: "Push-up", details: "15 reps" },
          { name: "Plank", details: "45s" },
        ],
      },
      {
        round: 2,
        stations: [
          { name: "Pull-up", details: "7 reps" },
          { name: "Push-up", details: "12 reps" },
        ],
      },
    ]);
  });
});
