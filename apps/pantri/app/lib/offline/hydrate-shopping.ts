import type { IngredientCategoryOverrides } from "~/lib/ingredient-sections";
import { groupBySection } from "~/lib/ingredient-sections";
import { applyOutboxToSnapshot } from "~/lib/offline/apply-outbox";
import { mergeServerSnapshotWithLocal } from "~/lib/offline/merge-server-snapshot";
import { enqueueOutbox, listOutbox } from "~/lib/offline/outbox";
import {
  putShoppingSnapshot,
  readShoppingSnapshot,
  writeShoppingSnapshot,
} from "~/lib/offline/snapshot";
import {
  deserializeShoppingRecipes,
  type ShoppingSnapshot,
  serializeShoppingRecipes,
} from "~/lib/offline/types";
import type { OddBit } from "~/lib/recipe-schema";
import { aggregateIngredients, type ShoppingLine } from "~/lib/shopping-aggregation";
import type { SortedSectionState } from "~/lib/shopping-local-merge";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

export async function loadOfflineShoppingSnapshot(pantryId: string): Promise<{
  snapshot: ShoppingSnapshot;
  applied: ShoppingSnapshot;
} | null> {
  const snapshot = await readShoppingSnapshot(pantryId);
  if (!snapshot) return null;
  const outbox = await listOutbox(pantryId);
  return { snapshot, applied: applyOutboxToSnapshot(snapshot, outbox) };
}

/** Write server loader payload as snapshot base, return base+outbox for first paint. */
export async function writeSnapshotBaseAndApply(
  pantryId: string,
  input: {
    shoppingRecipes: ShoppingRecipeRecord[];
    oddBits: OddBit[];
    categoryOverrides?: IngredientCategoryOverrides;
  },
): Promise<ShoppingSnapshot> {
  const previous = await readShoppingSnapshot(pantryId);
  const serverBase: ShoppingSnapshot = {
    pantryId,
    updatedAt: Date.now(),
    shoppingRecipes: serializeShoppingRecipes(input.shoppingRecipes),
    oddBits: input.oddBits,
    categoryOverrides: input.categoryOverrides ?? previous?.categoryOverrides ?? {},
  };

  const { merged, repairs } = mergeServerSnapshotWithLocal(pantryId, serverBase, previous);

  // Server pull — notify UI as a transition so toggles stay urgent.
  await putShoppingSnapshot(merged, { priority: "transition" });

  // Re-push any purchased flags the server pull disagreed with (lost drain writes).
  for (const repair of repairs) {
    await enqueueOutbox({
      pantryId,
      actionPath: repair.actionPath,
      fields: repair.fields,
    });
  }

  const snapshot = await readShoppingSnapshot(pantryId);
  if (!snapshot) {
    throw new Error("Failed to persist shopping snapshot");
  }
  const outbox = await listOutbox(pantryId);
  return applyOutboxToSnapshot(snapshot, outbox);
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

// Re-export for callers that only need a raw write without merge (tests/seed).
export { writeShoppingSnapshot };
