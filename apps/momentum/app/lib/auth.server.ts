import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";

import * as schema from "~/db/schema";
import { assertEmailAllowed } from "~/lib/access.server";
import { createDb } from "~/lib/db.server";
import type { MomentumEnv } from "~/lib/env.server";

export function createAuth(env: MomentumEnv) {
  const db = createDb(env);

  return betterAuth({
    appName: "Momentum",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    user: {
      additionalFields: {
        preferredName: {
          type: "string",
          required: false,
          input: true,
        },
      },
    },
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
            const preferredName =
              typeof user.preferredName === "string" && user.preferredName.trim()
                ? user.preferredName.trim()
                : (user.name?.trim().split(/\s+/)[0] ?? null);
            return {
              data: {
                ...user,
                preferredName,
              },
            };
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
                message: "This email is not authorized to access Momentum.",
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
