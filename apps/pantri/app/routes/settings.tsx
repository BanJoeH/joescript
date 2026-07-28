import { redirect } from "react-router";

import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/settings";

/** Deep-link fallback — Settings nav opens the chooser sheet instead. */
export async function loader({ params }: Route.LoaderArgs) {
  throw redirect(pantryPath(params.pantryId, "shopping"));
}
