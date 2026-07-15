import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { createdAtColumn, deletedAtColumn, idColumn, updatedAtColumn } from "./columns";

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
