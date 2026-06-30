import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import {
  createdAtColumn,
  idColumn,
  optionalTimestampColumn,
  updatedAtColumn,
} from "./columns";

export const user = sqliteTable("user", {
  id: idColumn(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const session = sqliteTable("session", {
  id: idColumn(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: idColumn(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp_ms",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp_ms",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const verification = sqliteTable("verification", {
  id: idColumn(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: optionalTimestampColumn("created_at"),
  updatedAt: optionalTimestampColumn("updated_at"),
});
