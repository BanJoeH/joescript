import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return false;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}

const migrateEnv = process.env.PANTRI_MIGRATE_ENV;

if (migrateEnv === "prod") {
  loadEnvFile(".env.migrate.prod");
} else if (migrateEnv === "dev") {
  loadEnvFile(".env.migrate.dev");
} else if (migrateEnv === "local") {
  process.env.TURSO_DATABASE_URL ??= "file:local.db";
} else {
  // Default: dev migrate file, then wrangler dev vars as fallback.
  loadEnvFile(".env.migrate.dev");
  loadEnvFile(".dev.vars");
}

const databaseUrl = process.env.TURSO_DATABASE_URL ?? "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocalFile = databaseUrl.startsWith("file:");

export default defineConfig({
  schema: "./app/db/schema/index.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: databaseUrl,
    ...(isLocalFile || !authToken ? {} : { authToken }),
  },
});
