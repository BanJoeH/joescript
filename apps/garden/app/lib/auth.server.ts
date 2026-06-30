import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";

import * as schema from "~/db/schema";
import { assertEmailAllowed } from "~/lib/access.server";
import { createDb } from "~/lib/db.server";
import type { GardenEnv } from "~/lib/env.server";

export function createAuth(env: GardenEnv) {
  const db = createDb(env);

  return betterAuth({
    appName: "Garden",
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
          before: async (user) => {
            await assertEmailAllowed(db, user.email);
            return { data: user };
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

            if (!user) {
              throw new APIError("FORBIDDEN", {
                code: "not_allowed",
                message: "This email is not authorized to access Garden.",
              });
            }

            await assertEmailAllowed(db, user.email);
            return { data: session };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
