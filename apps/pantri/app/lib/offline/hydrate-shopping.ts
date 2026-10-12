import { groupBySection } from "~/lib/ingredient-sections";
import { applyOutboxToSnapshot } from "~/lib/offline/apply-outbox";
import { listOutbox } from "~/lib/offline/outbox";
import { readShoppingSnapshot } from "~/lib/offline/snapshot";
import { deserializeShoppingRecipes, type ShoppingSnapshot } from "~/lib/offline/types";
import { aggregateIngredients, type ShoppingLine } from "~/lib/shopping-aggregation";
import type { SortedSectionState } from "~/lib/shopping-local-merge";

export async function loadOfflineShoppingSnapshot(pantryId: string): Promise<{
  snapshot: ShoppingSnapshot;
  applied: ShoppingSnapshot;
} | null> {
  const snapshot = await readShoppingSnapshot(pantryId);
  if (!snapshot) return null;
  const outbox = await listOutbox(pantryId);
  return { snapshot, applied: applyOutboxToSnapshot(snapshot, outbox) };
}

export function sectionsFromSnapshot(snapshot: ShoppingSnapshot): SortedSectionState[] {
  const shoppingRecipes = deserializeShoppingRecipes(snapshot.shoppingRecipes);
  const lines: ShoppingLine[] = [
    ...shoppingRecipes.flatMap((recipe) =>
      recipe.ingredients.map((ingredient) => ({
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        purchased: ingredient.purchased,
        source: recipe.name,
      })),
    ),
    ...snapshot.oddBits
      .filter((bit) => bit.name)
      .map((bit) => ({
        name: bit.name,
        amount: bit.amount,
        unit: bit.unit,
        purchased: bit.purchased,
        source: "Odd Bits",
      })),
  ];
  const aggregated = aggregateIngredients(lines);
  return groupBySection(aggregated, (item) => item.name, snapshot.categoryOverrides);
}
