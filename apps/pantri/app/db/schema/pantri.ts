import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { createdAtColumn, deletedAtColumn, idColumn, updatedAtColumn } from "./columns";
import { pantries } from "./domain";

/**
 * Canonical recipe JSON shapes. Stored as serialized JSON text columns
 * (sqlite has no native JSON column type in Drizzle for Turso), parsed/
 * validated at the service boundary via `~/lib/recipe-schema`.
 *
 * RecipeIngredient = { name, amount: number|null, unit: string|null, notes?: string }
 * ShoppingIngredient = RecipeIngredient & { purchased: boolean }
 * RecipeStep = { order: number, text: string }
 */

export const recipes = sqliteTable("recipes", {
  id: idColumn(),
  pantryId: text("pantry_id")
    .notNull()
    .references(() => pantries.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  link: text("link"),
  servings: integer("servings"),
  ingredients: text("ingredients").notNull().default("[]"),
  steps: text("steps").notNull().default("[]"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
});

export const shoppingRecipes = sqliteTable("shopping_recipes", {
  id: idColumn(),
  pantryId: text("pantry_id")
    .notNull()
    .references(() => pantries.id, { onDelete: "cascade" }),
  sourceRecipeId: text("source_recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  link: text("link"),
  servings: integer("servings"),
  ingredients: text("ingredients").notNull().default("[]"),
  steps: text("steps").notNull().default("[]"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
});

export const oddBits = sqliteTable("odd_bits", {
  id: idColumn(),
  pantryId: text("pantry_id")
    .notNull()
    .references(() => pantries.id, { onDelete: "cascade" })
    .unique(),
  ingredients: text("ingredients").notNull().default("[]"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const ingredientCategories = sqliteTable(
  "ingredient_categories",
  {
    id: idColumn(),
    pantryId: text("pantry_id")
      .notNull()
      .references(() => pantries.id, { onDelete: "cascade" }),
    canonicalName: text("canonical_name").notNull(),
    section: text("section").notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    uniqueIndex("ingredient_categories_pantry_canonical_unique").on(
      table.pantryId,
      table.canonicalName,
    ),
  ],
);

export const recipePhotos = sqliteTable("recipe_photos", {
  id: idColumn(),
  pantryId: text("pantry_id")
    .notNull()
    .references(() => pantries.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  r2Key: text("r2_key").notNull(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});
