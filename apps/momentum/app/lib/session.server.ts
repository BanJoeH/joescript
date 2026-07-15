import { redirect } from "react-router";

import { isEmailAllowed } from "~/lib/access.server";
import { createAuth } from "~/lib/auth.server";
import { createDb } from "~/lib/db.server";
import type { MomentumEnv } from "~/lib/env.server";

export async function requireMomentumSession(request: Request, env: MomentumEnv) {
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw redirect("/login");
  }

  const db = createDb(env);
  const allowed = await isEmailAllowed(db, session.user.email);

  if (!allowed) {
    await auth.api.signOut({ headers: request.headers });
    throw redirect("/login?error=not_allowed");
  }

  return { auth, session, db };
}

export async function getOptionalMomentumSession(request: Request, env: MomentumEnv) {
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return null;
  }

  const db = createDb(env);
  const allowed = await isEmailAllowed(db, session.user.email);

  if (!allowed) {
    await auth.api.signOut({ headers: request.headers });
    return null;
  }

  return { auth, session, db };
}
