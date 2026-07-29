import { redirect } from "react-router";

import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.sorted-redirect";

/** Old top-level sorted URL → nested under shopping. */
export async function loader({ params }: Route.LoaderArgs) {
  throw redirect(pantryPath(params.pantryId, "shopping/sorted"));
}
