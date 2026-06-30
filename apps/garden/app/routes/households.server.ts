import { redirect } from "react-router";

import { getGardenEnv } from "~/lib/context.server";
import { householdPath } from "~/lib/household-path";
import { getString } from "~/lib/forms.server";
import { requireGardenSessionContext } from "~/services";
import { getFavoriteHouseholdId } from "~/services/households.service";

import type { Route } from "./+types/households";

export async function loader({ request }: Route.LoaderArgs) {
  const { session, db, userHouseholds } = await requireGardenSessionContext(
    request,
    getGardenEnv(),
  );
  const favoriteHouseholdId = await getFavoriteHouseholdId(db, session.user.id);

  return {
    user: session.user,
    households: userHouseholds,
    favoriteHouseholdId,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { households } = await requireGardenSessionContext(request, getGardenEnv());
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "create") {
    try {
      const household = await households.create({ name: getString(formData, "name") });
      throw redirect(householdPath(household.id));
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }
      return {
        error: error instanceof Error ? error.message : "Could not create household.",
      };
    }
  }

  if (intent === "toggle-favorite") {
    try {
      await households.toggleFavoriteHousehold(getString(formData, "householdId"));
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not update favourite.",
      };
    }
    return { ok: true as const };
  }

  return { error: "Unknown action." };
}
