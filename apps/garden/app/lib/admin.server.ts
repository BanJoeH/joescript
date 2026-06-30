import type { GardenEnv } from "~/lib/env.server";
import { isGardenAdmin } from "~/lib/admin";
import { getGardenEnv } from "~/lib/context.server";
import { requireGardenSession } from "~/lib/session.server";

export { GARDEN_ADMIN_EMAIL, isGardenAdmin } from "~/lib/admin";

export async function requireGardenAdmin(request: Request, env?: GardenEnv) {
  const context = await requireGardenSession(request, env ?? getGardenEnv());

  if (!isGardenAdmin(context.session.user.email)) {
    throw new Response("Not found", { status: 404 });
  }

  return context;
}
