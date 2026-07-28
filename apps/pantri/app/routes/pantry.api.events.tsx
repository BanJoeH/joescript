import { getPantriEnv, getWorkerEnv } from "~/lib/context.server";
import { requirePantriSession } from "~/lib/session.server";
import { requirePantriContext } from "~/services/context.server";

import type { Route } from "./+types/pantry.api.events";

/** SSE endpoint: proxies to this pantry's `PantryHub` Durable Object connection stream. */
export async function loader({ request, params }: Route.LoaderArgs) {
  const pantriEnv = getPantriEnv();
  const { session, db } = await requirePantriSession(request, pantriEnv);
  const { pantryId } = await requirePantriContext(db, session.user.id, params.pantryId);

  const env = getWorkerEnv();
  const id = env.PANTRY_HUB.idFromName(pantryId);
  const stub = env.PANTRY_HUB.get(id);

  return stub.fetch("https://pantry-hub/connect", {
    headers: request.headers,
    signal: request.signal,
  });
}
