import { redirect } from "react-router";

import { getGardenEnv } from "~/lib/context.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenSession } from "~/lib/session.server";
import { resolveHomeHouseholdId } from "~/services/households.service";

import type { Route } from "./+types/app-index";

export async function loader({ request }: Route.LoaderArgs) {
  const { session, db } = await requireGardenSession(request, getGardenEnv());
  const householdId = await resolveHomeHouseholdId(db, session.user.id);

  if (householdId) {
    throw redirect(householdPath(householdId));
  }

  throw redirect("/households");
}
