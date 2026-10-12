import type { IngredientCategoryOverrides } from "~/lib/ingredient-sections";
import { SNAPSHOT_STORE, withStore } from "~/lib/offline/db";
import { emitShoppingOfflineChange } from "~/lib/offline/events";
import type { ShoppingSnapshot } from "~/lib/offline/types";
import { serializeShoppingRecipes } from "~/lib/offline/types";
import type { OddBit } from "~/lib/recipe-schema";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

export async function readShoppingSnapshot(pantryId: string): Promise<ShoppingSnapshot | null> {
  try {
    return await withStore(SNAPSHOT_STORE, "readonly", (store) => store.get(pantryId));
  } catch {
    return null;
  }
}

export async function writeShoppingSnapshot(
  pantryId: string,
  input: {
    shoppingRecipes: ShoppingRecipeRecord[];
    oddBits: OddBit[];
    categoryOverrides?: IngredientCategoryOverrides;
  },
): Promise<void> {
  const previous = await readShoppingSnapshot(pantryId);
  const snapshot: ShoppingSnapshot = {
    pantryId,
    updatedAt: Date.now(),
    shoppingRecipes: serializeShoppingRecipes(input.shoppingRecipes),
    oddBits: input.oddBits,
    categoryOverrides: input.categoryOverrides ?? previous?.categoryOverrides ?? {},
  };
  await withStore(SNAPSHOT_STORE, "readwrite", (store) => store.put(snapshot));
  emitShoppingOfflineChange();
}

export async function putShoppingSnapshot(snapshot: ShoppingSnapshot): Promise<void> {
  await withStore(SNAPSHOT_STORE, "readwrite", (store) =>
    store.put({ ...snapshot, updatedAt: Date.now() }),
  );
  emitShoppingOfflineChange();
}
