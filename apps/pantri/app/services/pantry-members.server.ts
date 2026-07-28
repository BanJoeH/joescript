import { and, eq, isNull } from "drizzle-orm";

import { pantryMembers } from "~/db/schema";
import type { Database } from "~/lib/db.server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export { normalizeEmail };

/**
 * Open signup: anyone can be invited to a pantry by email, and anyone who
 * signs in with that email is linked to the pending membership automatically
 * (no allowlist gate).
 */
export async function linkPendingPantryMemberships(db: Database, userId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);

  await db
    .update(pantryMembers)
    .set({ userId, email: normalizedEmail, updatedAt: new Date() })
    .where(
      and(
        eq(pantryMembers.email, normalizedEmail),
        isNull(pantryMembers.userId),
        isNull(pantryMembers.deletedAt),
      ),
    );
}
