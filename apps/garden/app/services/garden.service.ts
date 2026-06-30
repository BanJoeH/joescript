import { createAreasService } from "~/services/areas.service";
import { createCareRulesService } from "~/services/care-rules.service";
import { createDashboardService } from "~/services/dashboard.service";
import { createHouseholdsService } from "~/services/households.service";
import { createJournalService } from "~/services/journal.service";
import { createPlantsService } from "~/services/plants.service";
import type { GardenContext } from "~/services/types";

export function createGardenService(context: GardenContext) {
  return {
    areas: createAreasService(context),
    plants: createPlantsService(context),
    careRules: createCareRulesService(context),
    journal: createJournalService(context),
    dashboard: createDashboardService(context),
    households: createHouseholdsService({ db: context.db, userId: context.userId }),
  };
}

export type GardenService = ReturnType<typeof createGardenService>;
