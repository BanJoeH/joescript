import { redirect } from "react-router";

import { getPantriEnv } from "~/lib/context.server";
import { getString } from "~/lib/forms.server";
import { pantryPath } from "~/lib/pantry-path";
import { requirePantriSessionContext } from "~/services";
import { getFavoritePantryId } from "~/services/pantries.service";

import type { Route } from "./+types/pantries";

export async function loader({ request }: Route.LoaderArgs) {
  const { session, db, userPantries } = await requirePantriSessionContext(request, getPantriEnv());
  const favoritePantryId = await getFavoritePantryId(db, session.user.id);

  return {
    user: session.user,
    pantries: userPantries,
    favoritePantryId,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { pantries } = await requirePantriSessionContext(request, getPantriEnv());
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "create") {
    try {
      const pantry = await pantries.create({ name: getString(formData, "name") });
      throw redirect(pantryPath(pantry.id, "shopping"));
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }
      return {
        error: error instanceof Error ? error.message : "Could not create pantry.",
      };
    }
  }

  if (intent === "toggle-favorite") {
    try {
      await pantries.toggleFavoritePantry(getString(formData, "pantryId"));
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not update favourite.",
      };
    }
    return { ok: true as const };
  }

  return { error: "Unknown action." };
}
