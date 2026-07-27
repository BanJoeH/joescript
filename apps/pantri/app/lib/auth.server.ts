import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import * as schema from "~/db/schema";
import { createDb } from "~/lib/db.server";
import type { PantriEnv } from "~/lib/env.server";
import { linkPendingPantryMemberships } from "~/services/pantry-members.server";

export function createAuth(env: PantriEnv) {
  const db = createDb(env);

  return betterAuth({
    appName: "Pantri",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    onAPIError: {
      errorURL: `${env.BETTER_AUTH_URL}/login`,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await linkPendingPantryMemberships(db, user.id, user.email);
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const [user] = await db
              .select({ email: schema.user.email })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId))
              .limit(1);

            if (user) {
              await linkPendingPantryMemberships(db, session.userId, user.email);
            }

            return { data: session };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
