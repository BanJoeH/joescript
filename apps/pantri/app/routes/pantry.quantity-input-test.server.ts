import { getPantriEnv } from "~/lib/context.server";
import { requirePantriService } from "~/services";

import type { Route } from "./+types/pantry.quantity-input-test";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { pantryId } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  return { pantryId };
}
