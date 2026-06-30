import { APIError } from "better-auth/api";
import { and, eq, isNull } from "drizzle-orm";

import { allowedEmails } from "~/db/schema";
import type { Database } from "~/lib/db.server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export { normalizeEmail };

export async function isEmailAllowed(db: Database, email: string) {
  const [row] = await db
    .select({ id: allowedEmails.id })
    .from(allowedEmails)
    .where(and(eq(allowedEmails.email, normalizeEmail(email)), isNull(allowedEmails.deletedAt)))
    .limit(1);

  return row !== undefined;
}

export const ACCESS_DENIED_CODE = "not_allowed";

export async function assertEmailAllowed(db: Database, email: string) {
  if (!(await isEmailAllowed(db, email))) {
    throw new APIError("FORBIDDEN", {
      code: ACCESS_DENIED_CODE,
      message: "This email is not authorized to access Garden.",
    });
  }
}
