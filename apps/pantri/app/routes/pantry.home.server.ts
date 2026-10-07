import { getPantriEnv } from "~/lib/context.server";
import { requirePantriService } from "~/services";

import type { Route } from "./+types/pantry.home";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { pantri, pantryId } = await requirePantriService(request, getPantriEnv(), params.pantryId);

  // Always load recipes: the home layout loader does not re-run when navigating
  // between /shopping and /recipes (sibling child routes), so skipping recipes on
  // the shopping URL leaves the recipes tab empty until a full refresh.
  const [shoppingRecipes, oddBits, recipes, categoryOverrides] = await Promise.all([
    pantri.shopping.list(),
    pantri.oddBits.list(),
    pantri.recipes.list(),
    pantri.categories.getOverrides(),
  ]);

  return { shoppingRecipes, oddBits, recipes, categoryOverrides, pantryId };
}
