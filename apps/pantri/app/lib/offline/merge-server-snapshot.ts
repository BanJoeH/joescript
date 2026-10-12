import { pantryPath } from "~/lib/pantry-path";
import type { OddBit } from "~/lib/recipe-schema";
import type { SerializedShoppingRecipe, ShoppingSnapshot } from "~/lib/offline/types";

export type PurchasedRepair = {
  actionPath: string;
  fields: Record<string, string>;
};

/**
 * After a server pull, find purchased flags where the local snapshot disagrees
 * with the server. Prefer local (just-folded drain commits) and return outbox
 * repairs so the server is pushed again instead of silently losing offline work.
 */
export function mergeServerSnapshotWithLocal(
  pantryId: string,
  server: ShoppingSnapshot,
  local: ShoppingSnapshot | null,
): { merged: ShoppingSnapshot; repairs: PurchasedRepair[] } {
  if (!local) return { merged: server, repairs: [] };

  const repairs: PurchasedRepair[] = [];
  const shoppingAction = pantryPath(pantryId, "shopping");
  const sortedAction = pantryPath(pantryId, "shopping/sorted");

  const localOddById = new Map(local.oddBits.map((bit) => [bit.id, bit]));
  const oddBits: OddBit[] = server.oddBits.map((serverBit) => {
    const localBit = localOddById.get(serverBit.id);
    if (!localBit || localBit.purchased === serverBit.purchased) return serverBit;
    repairs.push({
      actionPath: shoppingAction,
      fields: {
        intent: "toggle-odd-bit",
        id: localBit.id,
        purchased: String(localBit.purchased),
      },
    });
    return { ...serverBit, purchased: localBit.purchased };
  });

  // Keep local-only odd bits (e.g. undrained client-id adds already in base via fold,
  // or adds still only local — server list shouldn't drop them if outbox empty after fold).
  for (const localBit of local.oddBits) {
    if (oddBits.some((bit) => bit.id === localBit.id)) continue;
    oddBits.push(localBit);
  }

  const localRecipeById = new Map(local.shoppingRecipes.map((recipe) => [recipe.id, recipe]));
  const shoppingRecipes: SerializedShoppingRecipe[] = server.shoppingRecipes.map((serverRecipe) => {
    const localRecipe = localRecipeById.get(serverRecipe.id);
    if (!localRecipe) return serverRecipe;

    const localIngById = new Map(localRecipe.ingredients.map((ing) => [ing.id, ing]));
    const ingredients = serverRecipe.ingredients.map((serverIng) => {
      const localIng = localIngById.get(serverIng.id);
      if (!localIng || localIng.purchased === serverIng.purchased) return serverIng;

      // Prefer name toggle on sorted path so all instances stay consistent on replay.
      repairs.push({
        actionPath: sortedAction,
        fields: {
          intent: "toggle",
          name: localIng.name,
          purchased: String(localIng.purchased),
        },
      });
      return { ...serverIng, purchased: localIng.purchased };
    });

    return { ...serverRecipe, ingredients };
  });

  return {
    merged: {
      ...server,
      oddBits,
      shoppingRecipes,
      // Keep local aisle overrides when server omitted them.
      categoryOverrides: { ...server.categoryOverrides, ...local.categoryOverrides },
    },
    repairs: dedupeRepairs(repairs),
  };
}

function dedupeRepairs(repairs: PurchasedRepair[]): PurchasedRepair[] {
  const seen = new Set<string>();
  const out: PurchasedRepair[] = [];
  for (const repair of repairs) {
    const key = `${repair.actionPath}|${repair.fields.intent}|${repair.fields.id ?? ""}|${repair.fields.name ?? ""}|${repair.fields.purchased ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(repair);
  }
  return out;
}
