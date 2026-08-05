import { env as workerEnv } from "cloudflare:workers";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "react-router";

import { pantries } from "~/db/schema";
import { getPantriEnv } from "~/lib/context.server";
import type { Database } from "~/lib/db.server";
import type { PantriEnv } from "~/lib/env.server";
import { assertPantryMember, getPantryIdFromRequest } from "~/lib/pantry-path.server";
import { getCachedPantriService, getCachedSessionContext } from "~/lib/request-context.server";
import { requirePantriSession } from "~/lib/session.server";
import { createPantriService } from "~/services/pantri.service";
import { createPantriesService, listPantriesForUser } from "~/services/pantries.service";
import type { PantriContext } from "~/services/types";

export { listPantriesForUser } from "~/services/pantries.service";

async function loadPantriSessionContext(request: Request, env: PantriEnv) {
  const { session, db } = await requirePantriSession(request, env);
  const userPantries = await listPantriesForUser(db, session.user.id);
  const pantriesService = createPantriesService({ db, userId: session.user.id });

  return {
    session,
    db,
    userId: session.user.id,
    userPantries,
    pantries: pantriesService,
  };
}

export async function requirePantriSessionContext(request: Request, env?: PantriEnv) {
  return getCachedSessionContext(request, () =>
    loadPantriSessionContext(request, env ?? getPantriEnv()),
  );
}

export async function requirePantriContext(
  db: Database,
  userId: string,
  pantryId: string,
): Promise<PantriContext> {
  await assertPantryMember(db, userId, pantryId);
  return { db, userId, pantryId, photosBucket: workerEnv.PHOTOS };
}

async function loadPantriService(request: Request, env: PantriEnv, pantryId?: string) {
  const sessionContext = await requirePantriSessionContext(request, env);
  const resolvedPantryId = pantryId ?? getPantryIdFromRequest(request);

  if (!resolvedPantryId) {
    throw redirect("/pantries");
  }

  const pantry = sessionContext.userPantries.find((entry) => entry.id === resolvedPantryId);
  if (!pantry) {
    throw redirect("/pantries");
  }

  const context: PantriContext = {
    db: sessionContext.db,
    userId: sessionContext.userId,
    pantryId: resolvedPantryId,
    photosBucket: workerEnv.PHOTOS,
  };
  const pantri = createPantriService(context);

  return {
    pantri,
    session: sessionContext.session,
    context,
    userPantries: sessionContext.userPantries,
    pantryId: resolvedPantryId,
    pantryName: pantry.name,
  };
}

export async function requirePantriService(request: Request, env?: PantriEnv, pantryId?: string) {
  const pantriEnv = env ?? getPantriEnv();
  const resolvedPantryId = pantryId ?? getPantryIdFromRequest(request);

  if (!resolvedPantryId) {
    throw redirect("/pantries");
  }

  return getCachedPantriService(request, resolvedPantryId, () =>
    loadPantriService(request, pantriEnv, resolvedPantryId),
  );
}

export async function getPantryName(db: Database, pantryId: string) {
  const [pantry] = await db
    .select({ name: pantries.name })
    .from(pantries)
    .where(and(eq(pantries.id, pantryId), isNull(pantries.deletedAt)))
    .limit(1);

  return pantry?.name ?? null;
}
