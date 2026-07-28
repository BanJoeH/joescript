import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { createdAtColumn, deletedAtColumn, idColumn, updatedAtColumn } from "./columns";

export const pantries = sqliteTable(
  "pantries",
  {
    id: idColumn(),
    name: text("name").notNull(),
    revision: integer("revision").notNull().default(0),
    legacyFirebaseUid: text("legacy_firebase_uid"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (table) => [uniqueIndex("pantries_legacy_firebase_uid_unique").on(table.legacyFirebaseUid)],
);

export const pantryMembers = sqliteTable(
  "pantry_members",
  {
    id: idColumn(),
    pantryId: text("pantry_id")
      .notNull()
      .references(() => pantries.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    email: text("email"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (table) => [
    uniqueIndex("pantry_members_pantry_user_unique")
      .on(table.pantryId, table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex("pantry_members_pantry_email_unique")
      .on(table.pantryId, table.email)
      .where(sql`${table.email} is not null`),
  ],
);

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  favoritePantryId: text("favorite_pantry_id").references(() => pantries.id, {
    onDelete: "set null",
  }),
  updatedAt: updatedAtColumn(),
});
