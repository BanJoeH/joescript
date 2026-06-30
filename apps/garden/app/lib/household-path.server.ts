import { redirect } from "react-router";

import type { Database } from "~/lib/db.server";
import { getHouseholdIdFromPath } from "~/lib/household-path";
import { listHouseholdsForUser } from "~/services/households.service";

export function getHouseholdIdFromRequest(request: Request) {
  return getHouseholdIdFromPath(new URL(request.url).pathname);
}

export async function assertHouseholdMember(db: Database, userId: string, householdId: string) {
  const households = await listHouseholdsForUser(db, userId);

  if (!households.some((household) => household.id === householdId)) {
    throw redirect("/households");
  }

  return householdId;
}
