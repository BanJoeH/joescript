import { isMomentumAdmin } from "~/lib/admin";
import { getMomentumEnv } from "~/lib/context.server";
import type { MomentumEnv } from "~/lib/env.server";
import { requireMomentumSession } from "~/lib/session.server";

export { isMomentumAdmin, MOMENTUM_ADMIN_EMAIL } from "~/lib/admin";

export async function requireMomentumAdmin(request: Request, env?: MomentumEnv) {
  const context = await requireMomentumSession(request, env ?? getMomentumEnv());

  if (!isMomentumAdmin(context.session.user.email)) {
    throw new Response("Not found", { status: 404 });
  }

  return context;
}
