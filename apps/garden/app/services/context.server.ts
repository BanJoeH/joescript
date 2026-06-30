import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "react-router";

import { households } from "~/db/schema";
import type { Database } from "~/lib/db.server";
import type { GardenEnv } from "~/lib/env.server";
import { getGardenEnv } from "~/lib/context.server";
import { assertHouseholdMember, getHouseholdIdFromRequest } from "~/lib/household-path.server";
import { requireGardenSession } from "~/lib/session.server";
import { createGardenService } from "~/services/garden.service";
import { createHouseholdsService, listHouseholdsForUser } from "~/services/households.service";
import type { GardenContext } from "~/services/types";

export { listHouseholdsForUser } from "~/services/households.service";

export async function requireGardenSessionContext(request: Request, env?: GardenEnv) {
  const { session, db } = await requireGardenSession(request, env ?? getGardenEnv());
  const userHouseholds = await listHouseholdsForUser(db, session.user.id);
  const households = createHouseholdsService({ db, userId: session.user.id });

  return {
    session,
    db,
    userId: session.user.id,
    userHouseholds,
    households,
  };
}

export async function requireGardenContext(
  db: Database,
  userId: string,
  householdId: string,
): Promise<GardenContext> {
  await assertHouseholdMember(db, userId, householdId);
  return { db, userId, householdId };
}

export async function requireGardenService(
  request: Request,
  env?: GardenEnv,
  householdId?: string,
) {
  const sessionContext = await requireGardenSessionContext(request, env);
  const resolvedHouseholdId = householdId ?? getHouseholdIdFromRequest(request);

  if (!resolvedHouseholdId) {
    throw redirect("/households");
  }

  await assertHouseholdMember(sessionContext.db, sessionContext.userId, resolvedHouseholdId);

  const context: GardenContext = {
    db: sessionContext.db,
    userId: sessionContext.userId,
    householdId: resolvedHouseholdId,
  };
  const garden = createGardenService(context);
  const householdName = await getHouseholdName(context.db, resolvedHouseholdId);

  return {
    garden,
    session: sessionContext.session,
    context,
    userHouseholds: sessionContext.userHouseholds,
    householdId: resolvedHouseholdId,
    householdName,
  };
}

export async function getHouseholdName(db: Database, householdId: string) {
  const [household] = await db
    .select({ name: households.name })
    .from(households)
    .where(and(eq(households.id, householdId), isNull(households.deletedAt)))
    .limit(1);

  return household?.name ?? null;
}
