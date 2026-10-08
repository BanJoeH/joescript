import Dexie, { type EntityTable } from "dexie";

import type { IngredientCategoryOverrides } from "~/lib/ingredient-sections";
import type { ShoppingIngredient } from "~/lib/recipe-schema";
import type { RecipeRecord } from "~/services/recipes.service";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

export type SerializedRecipe = Omit<RecipeRecord, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type SerializedShoppingRecipe = Omit<ShoppingRecipeRecord, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type PantrySnapshotRow = {
  pantryId: string;
  revision: number | null;
  fetchedAt: string;
  shoppingRecipes: SerializedShoppingRecipe[];
  oddBits: ShoppingIngredient[];
  recipes: SerializedRecipe[];
  /** Sorted-aisle overrides; optional on older snapshots. */
  categoryOverrides?: IngredientCategoryOverrides;
};

export type RecipeDetailRow = {
  key: string;
  pantryId: string;
  recipeId: string;
  fetchedAt: string;
  recipe: SerializedRecipe;
};

export type OutboxEntry = {
  id: string;
  pantryId: string;
  actionUrl: string;
  formEntries: Array<[string, string]>;
  createdAt: string;
  attempts: number;
  lastError: string | null;
};

export type ShareCacheRow = {
  token: string;
  fetchedAt: string;
  payload: unknown;
};

export type PhotoCacheMeta = {
  url: string;
  fetchedAt: string;
};

export type PantryLayoutRow = {
  pantryId: string;
  fetchedAt: string;
  /** Serialized layout loader payload (user + pantry list). */
  payload: {
    user: {
      id: string;
      createdAt: string;
      updatedAt: string;
      email: string;
      emailVerified: boolean;
      name: string;
      image?: string | null;
    };
    pantryId: string;
    pantryName: string | null;
    pantries: Array<{ id: string; name: string }>;
  };
};

class PantriOfflineDb extends Dexie {
  snapshots!: EntityTable<PantrySnapshotRow, "pantryId">;
  recipeDetails!: EntityTable<RecipeDetailRow, "key">;
  outbox!: EntityTable<OutboxEntry, "id">;
  shareCache!: EntityTable<ShareCacheRow, "token">;
  photoMeta!: EntityTable<PhotoCacheMeta, "url">;
  pantryLayouts!: EntityTable<PantryLayoutRow, "pantryId">;

  constructor() {
    super("pantri-offline");
    this.version(1).stores({
      snapshots: "pantryId",
      recipeDetails: "key, pantryId, recipeId",
      outbox: "id, pantryId, createdAt",
      shareCache: "token",
      photoMeta: "url",
    });
    this.version(2).stores({
      snapshots: "pantryId",
      recipeDetails: "key, pantryId, recipeId",
      outbox: "id, pantryId, createdAt",
      shareCache: "token",
      photoMeta: "url",
      pantryLayouts: "pantryId",
    });
  }
}

let dbInstance: PantriOfflineDb | null = null;

export function getOfflineDb() {
  if (!dbInstance) {
    dbInstance = new PantriOfflineDb();
  }
  return dbInstance;
}

/** Test helper: reset the singleton so fake-indexeddb can start clean. */
export function resetOfflineDbForTests() {
  dbInstance = null;
}

export function recipeDetailKey(pantryId: string, recipeId: string) {
  return `${pantryId}:${recipeId}`;
}
