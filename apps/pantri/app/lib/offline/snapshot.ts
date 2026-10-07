import type { IngredientCategoryOverrides } from "~/lib/ingredient-sections";
import { notifySnapshotUpdated } from "~/lib/offline/connectivity";
import {
  getOfflineDb,
  type PantryLayoutRow,
  type PantrySnapshotRow,
  recipeDetailKey,
  type SerializedRecipe,
} from "~/lib/offline/db";
import {
  deserializeRecipe,
  deserializeShoppingRecipe,
  serializeRecipe,
  serializeShoppingRecipe,
} from "~/lib/offline/serialize";
import type { ShoppingIngredient } from "~/lib/recipe-schema";
import type { RecipeRecord } from "~/services/recipes.service";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

export type HomeLoaderSnapshot = {
  shoppingRecipes: ShoppingRecipeRecord[];
  oddBits: ShoppingIngredient[];
  recipes: RecipeRecord[];
  pantryId: string;
  categoryOverrides: IngredientCategoryOverrides;
  offline?: boolean;
  fetchedAt?: string;
};

export async function saveHomeSnapshot(data: {
  pantryId: string;
  shoppingRecipes: ShoppingRecipeRecord[];
  oddBits: ShoppingIngredient[];
  recipes: RecipeRecord[];
  categoryOverrides?: IngredientCategoryOverrides;
  revision?: number | null;
}): Promise<PantrySnapshotRow> {
  const existing = await getOfflineDb().snapshots.get(data.pantryId);
  const row: PantrySnapshotRow = {
    pantryId: data.pantryId,
    revision: data.revision ?? null,
    fetchedAt: new Date().toISOString(),
    shoppingRecipes: data.shoppingRecipes.map(serializeShoppingRecipe),
    oddBits: data.oddBits,
    recipes: data.recipes.map(serializeRecipe),
    categoryOverrides: data.categoryOverrides ?? existing?.categoryOverrides ?? {},
  };
  await getOfflineDb().snapshots.put(row);
  notifySnapshotUpdated(data.pantryId);
  return row;
}

export async function getHomeSnapshot(pantryId: string): Promise<HomeLoaderSnapshot | null> {
  const row = await getOfflineDb().snapshots.get(pantryId);
  if (!row) return null;
  return {
    pantryId: row.pantryId,
    shoppingRecipes: row.shoppingRecipes.map(deserializeShoppingRecipe),
    oddBits: row.oddBits,
    recipes: row.recipes.map(deserializeRecipe),
    categoryOverrides: row.categoryOverrides ?? {},
    offline: true,
    fetchedAt: row.fetchedAt,
  };
}

export async function saveCategoryOverrides(
  pantryId: string,
  categoryOverrides: IngredientCategoryOverrides,
) {
  return updateHomeSnapshot(pantryId, (current) => ({
    ...current,
    categoryOverrides,
    fetchedAt: new Date().toISOString(),
  }));
}

export async function getHomeSnapshotMeta(pantryId: string) {
  const row = await getOfflineDb().snapshots.get(pantryId);
  if (!row) return null;
  return { fetchedAt: row.fetchedAt, revision: row.revision };
}

export async function updateHomeSnapshot(
  pantryId: string,
  updater: (current: PantrySnapshotRow) => PantrySnapshotRow | null,
) {
  const db = getOfflineDb();
  const current = await db.snapshots.get(pantryId);
  if (!current) return null;
  const next = updater(current);
  if (!next) return null;
  await db.snapshots.put(next);
  notifySnapshotUpdated(pantryId);
  return next;
}

export async function saveRecipeDetail(pantryId: string, recipe: RecipeRecord) {
  const serialized = serializeRecipe(recipe);
  await getOfflineDb().recipeDetails.put({
    key: recipeDetailKey(pantryId, recipe.id),
    pantryId,
    recipeId: recipe.id,
    fetchedAt: new Date().toISOString(),
    recipe: serialized,
  });

  // Keep list snapshot in sync when we have one.
  await updateHomeSnapshot(pantryId, (current) => {
    const recipes = [...current.recipes];
    const index = recipes.findIndex((item) => item.id === recipe.id);
    if (index === -1) recipes.push(serialized);
    else recipes[index] = serialized;
    return { ...current, recipes };
  });

  notifySnapshotUpdated(pantryId);
}

export async function getRecipeDetail(
  pantryId: string,
  recipeId: string,
): Promise<{
  recipe: RecipeRecord;
  pantryId: string;
  offline?: boolean;
  fetchedAt?: string;
} | null> {
  const row = await getOfflineDb().recipeDetails.get(recipeDetailKey(pantryId, recipeId));
  if (row) {
    return {
      recipe: deserializeRecipe(row.recipe),
      pantryId,
      offline: true,
      fetchedAt: row.fetchedAt,
    };
  }

  const home = await getOfflineDb().snapshots.get(pantryId);
  const fromList = home?.recipes.find((recipe) => recipe.id === recipeId);
  if (!fromList) return null;
  return {
    recipe: deserializeRecipe(fromList),
    pantryId,
    offline: true,
    fetchedAt: home?.fetchedAt,
  };
}

export async function upsertRecipeInSnapshot(pantryId: string, recipe: SerializedRecipe) {
  await updateHomeSnapshot(pantryId, (current) => {
    const recipes = [...current.recipes];
    const index = recipes.findIndex((item) => item.id === recipe.id);
    if (index === -1) recipes.push(recipe);
    else recipes[index] = recipe;
    return { ...current, recipes };
  });
  await getOfflineDb().recipeDetails.put({
    key: recipeDetailKey(pantryId, recipe.id),
    pantryId,
    recipeId: recipe.id,
    fetchedAt: new Date().toISOString(),
    recipe,
  });
}

export async function removeRecipeFromSnapshot(pantryId: string, recipeId: string) {
  await updateHomeSnapshot(pantryId, (current) => ({
    ...current,
    recipes: current.recipes.filter((recipe) => recipe.id !== recipeId),
  }));
  await getOfflineDb().recipeDetails.delete(recipeDetailKey(pantryId, recipeId));
}

function layoutBackupKey(pantryId: string) {
  return `pantri:layout-backup:${pantryId}`;
}

function layoutFromRow(row: PantryLayoutRow) {
  return {
    user: {
      ...row.payload.user,
      createdAt: new Date(row.payload.user.createdAt),
      updatedAt: new Date(row.payload.user.updatedAt),
    },
    pantryId: row.payload.pantryId,
    pantryName: row.payload.pantryName,
    pantries: row.payload.pantries,
  };
}

export async function savePantryLayoutSnapshot(data: {
  pantryId: string;
  user: {
    id: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
  };
  pantryName: string | null;
  pantries: Array<{ id: string; name: string }>;
}) {
  const row: PantryLayoutRow = {
    pantryId: data.pantryId,
    fetchedAt: new Date().toISOString(),
    payload: {
      user: {
        ...data.user,
        createdAt:
          data.user.createdAt instanceof Date
            ? data.user.createdAt.toISOString()
            : data.user.createdAt,
        updatedAt:
          data.user.updatedAt instanceof Date
            ? data.user.updatedAt.toISOString()
            : data.user.updatedAt,
      },
      pantryId: data.pantryId,
      pantryName: data.pantryName,
      pantries: data.pantries,
    },
  };
  await getOfflineDb().pantryLayouts.put(row);
  try {
    sessionStorage.setItem(layoutBackupKey(data.pantryId), JSON.stringify(row));
  } catch {
    // Private mode / quota — Dexie remains the primary store.
  }
  return row;
}

export async function getPantryLayoutSnapshot(pantryId: string) {
  const row = await getOfflineDb().pantryLayouts.get(pantryId);
  if (row) return layoutFromRow(row);

  // Fallback when IndexedDB was cleared but this tab still has a backup.
  try {
    const raw = sessionStorage.getItem(layoutBackupKey(pantryId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PantryLayoutRow;
    await getOfflineDb().pantryLayouts.put(parsed);
    return layoutFromRow(parsed);
  } catch {
    return null;
  }
}
