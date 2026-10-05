import { and, eq, isNull } from "drizzle-orm";

import { pantryMembers, recipes } from "~/db/schema";
import type { Database } from "~/lib/db.server";
import { isShareToken } from "~/lib/recipe-share";

/** Recipe already owned by the user via the same public share token (any of their pantries). */
export async function findRecipeByShareTokenForUser(
  db: Database,
  userId: string,
  token: string,
): Promise<{ pantryId: string; recipeId: string } | null> {
  if (!isShareToken(token)) return null;

  const [row] = await db
    .select({
      pantryId: recipes.pantryId,
      recipeId: recipes.id,
    })
    .from(recipes)
    .innerJoin(
      pantryMembers,
      and(
        eq(pantryMembers.pantryId, recipes.pantryId),
        eq(pantryMembers.userId, userId),
        isNull(pantryMembers.deletedAt),
      ),
    )
    .where(and(eq(recipes.shareToken, token), isNull(recipes.deletedAt)))
    .limit(1);

  return row ?? null;
}
