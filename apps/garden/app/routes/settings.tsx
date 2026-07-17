import { redirect } from "react-router";

import { householdPath } from "~/lib/household-path";

import type { Route } from "./+types/settings";

export async function loader({ params }: Route.LoaderArgs) {
  throw redirect(householdPath(params.householdId, "settings/personal"));
}
