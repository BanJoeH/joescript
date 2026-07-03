import { getGardenEnv } from "~/lib/context.server";
import { requireGardenService } from "~/services";
import { normalizeSearchQuery } from "~/services/plant-lookup.service";

import type { Route } from "./+types/api.plants.search";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
  const query = normalizeSearchQuery(rawQuery);

  if (!garden.plantLookup.isConfigured()) {
    return {
      configured: false,
      query,
      results: [],
      error: "Plant search is not configured.",
    };
  }

  try {
    const results = await garden.plantLookup.search(query);
    return { configured: true, query, results };
  } catch (error) {
    return {
      configured: true,
      query,
      results: [],
      error: error instanceof Error ? error.message : "Plant search failed.",
    };
  }
}
