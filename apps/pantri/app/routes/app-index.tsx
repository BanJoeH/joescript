import { redirect } from "react-router";

import { getPantriEnv } from "~/lib/context.server";
import { pantryPath } from "~/lib/pantry-path";
import { requirePantriSession } from "~/lib/session.server";
import { resolveHomePantryId } from "~/services/pantries.service";

import type { Route } from "./+types/app-index";

export async function loader({ request }: Route.LoaderArgs) {
  const { session, db } = await requirePantriSession(request, getPantriEnv());
  const pantryId = await resolveHomePantryId(db, session.user.id);

  if (pantryId) {
    throw redirect(pantryPath(pantryId, "shopping"));
  }

  throw redirect("/pantries");
}
