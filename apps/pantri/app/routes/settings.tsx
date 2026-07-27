import { redirect } from "react-router";

import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/settings";

export async function loader({ params }: Route.LoaderArgs) {
  throw redirect(pantryPath(params.pantryId, "settings/personal"));
}
