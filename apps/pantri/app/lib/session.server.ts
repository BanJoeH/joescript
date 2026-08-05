import { redirect } from "react-router";

import { createAuth } from "~/lib/auth.server";
import { createDb } from "~/lib/db.server";
import type { PantriEnv } from "~/lib/env.server";
import { getCachedSession, type PantriSessionResult } from "~/lib/request-context.server";

async function loadPantriSession(
  request: Request,
  env: PantriEnv,
): Promise<PantriSessionResult | null> {
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return null;
  }

  const db = createDb(env);

  return { auth, session, db };
}

export async function requirePantriSession(request: Request, env: PantriEnv) {
  const session = await getCachedSession(request, () => loadPantriSession(request, env));

  if (!session) {
    throw redirect("/login");
  }

  return session;
}

export async function getOptionalPantriSession(request: Request, env: PantriEnv) {
  return getCachedSession(request, () => loadPantriSession(request, env));
}
