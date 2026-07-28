import { redirect } from "react-router";

import type { Database } from "~/lib/db.server";
import { getPantryIdFromPath } from "~/lib/pantry-path";
import { listPantriesForUser } from "~/services/pantries.service";

export function getPantryIdFromRequest(request: Request) {
  return getPantryIdFromPath(new URL(request.url).pathname);
}

export async function assertPantryMember(db: Database, userId: string, pantryId: string) {
  const pantries = await listPantriesForUser(db, userId);

  if (!pantries.some((pantry) => pantry.id === pantryId)) {
    throw redirect("/pantries");
  }

  return pantryId;
}
