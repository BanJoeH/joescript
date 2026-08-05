import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "react-router";

import { pantryMembers } from "~/db/schema";
import type { Database } from "~/lib/db.server";
import { getPantryIdFromPath } from "~/lib/pantry-path";

export function getPantryIdFromRequest(request: Request) {
  return getPantryIdFromPath(new URL(request.url).pathname);
}

export async function assertPantryMember(db: Database, userId: string, pantryId: string) {
  const [membership] = await db
    .select({ id: pantryMembers.id })
    .from(pantryMembers)
    .where(
      and(
        eq(pantryMembers.pantryId, pantryId),
        eq(pantryMembers.userId, userId),
        isNull(pantryMembers.deletedAt),
      ),
    )
    .limit(1);

  if (!membership) {
    throw redirect("/pantries");
  }

  return pantryId;
}
