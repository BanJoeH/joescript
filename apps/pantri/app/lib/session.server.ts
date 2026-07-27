import { redirect } from "react-router";

import { createAuth } from "~/lib/auth.server";
import { createDb } from "~/lib/db.server";
import type { PantriEnv } from "~/lib/env.server";

export async function requirePantriSession(request: Request, env: PantriEnv) {
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw redirect("/login");
  }

  const db = createDb(env);

  return { auth, session, db };
}

export async function getOptionalPantriSession(request: Request, env: PantriEnv) {
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return null;
  }

  const db = createDb(env);

  return { auth, session, db };
}
