import { getPantriEnv } from "~/lib/context.server";
import { requirePantriService } from "~/services";

import type { Route } from "./+types/pantry.home";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { pantri, pantryId } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const [shoppingRecipes, oddBits, recipes] = await Promise.all([
    pantri.shopping.list(),
    pantri.oddBits.list(),
    pantri.recipes.list(),
  ]);

  return { shoppingRecipes, oddBits, recipes, pantryId };
}
