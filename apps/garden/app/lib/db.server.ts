import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";

import * as schema from "~/db/schema";
import type { GardenEnv } from "~/lib/env.server";

export function createDb(env: GardenEnv) {
  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    ...(env.TURSO_AUTH_TOKEN ? { authToken: env.TURSO_AUTH_TOKEN } : {}),
  });

  return drizzle({ client, schema });
}

export type Database = ReturnType<typeof createDb>;
