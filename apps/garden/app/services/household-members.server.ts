import { and, eq, isNull } from "drizzle-orm";

import { householdMembers } from "~/db/schema";
import { normalizeEmail } from "~/lib/access.server";
import type { Database } from "~/lib/db.server";
import { touchFields } from "~/services/types";

export async function linkPendingHouseholdMemberships(
  db: Database,
  userId: string,
  email: string,
) {
  const normalizedEmail = normalizeEmail(email);

  await db
    .update(householdMembers)
    .set({ userId, email: normalizedEmail, ...touchFields(userId) })
    .where(
      and(
        eq(householdMembers.email, normalizedEmail),
        isNull(householdMembers.userId),
        isNull(householdMembers.deletedAt),
      ),
    );
}
