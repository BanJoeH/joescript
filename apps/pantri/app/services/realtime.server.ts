import { eq, sql } from "drizzle-orm";

import { pantries } from "~/db/schema";
import type { Database } from "~/lib/db.server";

export type NotifyPantryChangeOptions = {
  db: Database;
  env: Pick<Env, "PANTRY_HUB">;
  pantryId: string;
  actorId?: string;
};

/**
 * Bump a pantry's revision counter and fan the change out to any connected
 * SSE clients via that pantry's `PantryHub` Durable Object. Call this after
 * every mutation that should trigger a live revalidation for other viewers.
 */
export async function notifyPantryChange({
  db,
  env,
  pantryId,
  actorId,
}: NotifyPantryChangeOptions): Promise<number> {
  const now = new Date();
  const [row] = await db
    .update(pantries)
    .set({ revision: sql`${pantries.revision} + 1`, updatedAt: now })
    .where(eq(pantries.id, pantryId))
    .returning({ revision: pantries.revision });

  const revision = row?.revision ?? 0;

  try {
    const id = env.PANTRY_HUB.idFromName(pantryId);
    const stub = env.PANTRY_HUB.get(id);
    await stub.fetch("https://pantry-hub/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ revision, actorId: actorId ?? null }),
    });
  } catch {
    // Best effort: a broadcast failure (missing binding in local/test envs,
    // transient DO error) should never fail the underlying mutation.
  }

  return revision;
}
