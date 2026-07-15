import { getMomentumEnv } from "~/lib/context.server";
import { getRequestTimeZone } from "~/lib/dates";
import { requireMomentumSession } from "~/lib/session.server";
import { createAllowedEmailsService } from "~/services/allowed-emails.service";
import { createExercisesService } from "~/services/exercises.service";
import { createInsightsService } from "~/services/insights.engine";
import { createMeasurementsService } from "~/services/measurements.service";
import type { MomentumContext } from "~/services/types";
import { createWorkoutsService } from "~/services/workouts.service";

export function createMomentumService(context: MomentumContext, timeZone = "UTC") {
  const workouts = createWorkoutsService(context);
  const measurements = createMeasurementsService(context);
  const exercises = createExercisesService(context);
  const insightsEngine = createInsightsService();

  return {
    workouts,
    measurements,
    exercises,
    timeZone,
    async insights() {
      const workoutRows = await workouts.listForInsights();
      const measurementRows = await measurements.listForInsights();
      return insightsEngine.generate(workoutRows, measurementRows, new Date(), timeZone);
    },
  };
}

export async function requireMomentumService(request: Request) {
  const { session, db } = await requireMomentumSession(request, getMomentumEnv());
  const timeZone = getRequestTimeZone(request);
  const service = createMomentumService({ db, userId: session.user.id }, timeZone);
  return { service, session, db, timeZone };
}

export { createAllowedEmailsService };
