import { Outlet } from "react-router";

import { getGardenEnv } from "~/lib/context.server";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/household";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, householdId, householdName, userHouseholds } = await requireGardenService(
    request,
    getGardenEnv(),
    params.householdId,
  );

  return {
    user: session.user,
    householdId,
    householdName,
    households: userHouseholds,
  };
}

export default function HouseholdLayout() {
  return <Outlet />;
}
