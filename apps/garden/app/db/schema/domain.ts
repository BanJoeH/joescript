import { sql } from "drizzle-orm";
import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { createdAtColumn, deletedAtColumn, idColumn, updatedAtColumn } from "./columns";

export const households = sqliteTable("households", {
  id: idColumn(),
  name: text("name").notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
});

export const householdMembers = sqliteTable(
  "household_members",
  {
    id: idColumn(),
    householdId: text("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    email: text("email"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (table) => [
    uniqueIndex("household_members_household_user_unique")
      .on(table.householdId, table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex("household_members_household_email_unique")
      .on(table.householdId, table.email)
      .where(sql`${table.email} is not null`),
  ],
);

export const allowedEmails = sqliteTable(
  "allowed_emails",
  {
    id: idColumn(),
    email: text("email").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: deletedAtColumn(),
  },
  (table) => [uniqueIndex("allowed_emails_email_unique").on(table.email)],
);

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  favoriteHouseholdId: text("favorite_household_id").references(() => households.id, {
    onDelete: "set null",
  }),
  updatedAt: updatedAtColumn(),
});
