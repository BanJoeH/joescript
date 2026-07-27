/**
 * Import a legacy Pantri (Firestore) export into the Drizzle/Turso database.
 *
 * ## Usage
 *
 *   pnpm import:firestore <path-to-export.json> [--pantry-id=<existing-pantry-id>]
 *
 * By default this targets the same database `db:migrate:local` uses
 * (`file:local.db`), or `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` if set in the
 * environment. Set `PANTRI_MIGRATE_ENV=dev` or `prod` to load the matching
 * `.env.migrate.*` file instead, exactly like the drizzle-kit scripts do.
 *
 * ## Expected export shape
 *
 * The legacy app (see /src/types.ts in the original Pantri repo) stored data
 * per signed-in user, not per shared household — there was no multi-user
 * pantry concept. A Firestore export script (not included here, since it
 * depends on how you dump your project) should therefore produce one JSON
 * document per legacy user, shaped like `LegacyPantriExport` below:
 *
 *   - `legacyUid`: the Firebase Auth uid. Stored on `pantries.legacy_firebase_uid`
 *     so this script is safe to re-run against the same export (it upserts by
 *     that column instead of creating duplicate pantries).
 *   - `recipes`: the `recipes` collection — recipe templates with `ingredients`
 *     as an array of free-text strings (no structured amount/unit).
 *   - `shoppingList`: the `shoppingList` collection — the same shape, plus a
 *     `purchased` flag per ingredient.
 *   - `oddBits` / `ingredientCategories`: fields that lived on the user's
 *     profile document.
 *
 * Free-text ingredient strings (e.g. "200g plain flour", "2 onions", "salt")
 * are parsed into the structured `{ amount, unit, name }` shape with
 * `parseLegacyIngredientLine` below. It's a best-effort heuristic — review
 * imported recipes afterwards, especially anything with unusual units.
 *
 * Steps aren't part of the legacy schema at all, so imported recipes land
 * with a single placeholder step asking the user to fill in the method.
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import { pantries, pantryMembers } from "../app/db/schema/domain";
import { ingredientCategories, oddBits, recipes, shoppingRecipes } from "../app/db/schema/pantri";
import type { RecipeIngredient, RecipeStep, ShoppingIngredient } from "../app/lib/recipe-schema";
import {
  serializeRecipeIngredients,
  serializeRecipeSteps,
  serializeShoppingIngredients,
} from "../app/lib/recipe-schema";

type RawIngredient = string | { name: string; purchased?: boolean };

type LegacyRecipeTemplate = {
  id: string;
  name: string;
  link?: string;
  ingredients: string[];
};

type LegacyShoppingRecipe = {
  id: string;
  name: string;
  link?: string;
  ingredients: RawIngredient[];
};

type LegacyPantriExport = {
  legacyUid: string;
  pantryName?: string;
  memberEmails?: string[];
  recipes?: LegacyRecipeTemplate[];
  shoppingList?: LegacyShoppingRecipe[];
  oddBits?: RawIngredient[];
  ingredientCategories?: Record<string, string>;
};

const UNIT_ALIASES: Record<string, string> = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  millilitre: "ml",
  millilitres: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  litre: "l",
  litres: "l",
  liter: "l",
  liters: "l",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cup: "cup",
  cups: "cup",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  clove: "clove",
  cloves: "clove",
  can: "can",
  cans: "can",
  tin: "can",
  tins: "can",
  pack: "pack",
  packs: "pack",
  packet: "pack",
  packets: "pack",
  pinch: "pinch",
  pinches: "pinch",
};

const AMOUNT_UNIT_NAME = /^\s*([\d]+(?:[./]\d+)?)\s*([a-zA-Z]+)?\s+(.+?)\s*$/;

function parseAmount(raw: string): number | null {
  if (raw.includes("/")) {
    const [numerator, denominator] = raw.split("/").map(Number);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Best-effort parse of a legacy free-text ingredient line into the
 * structured `{ amount, unit, name }` shape. Falls back to `{ amount: null,
 * unit: null, name: <whole line> }` when nothing looks like a quantity.
 */
export function parseLegacyIngredientLine(raw: string): RecipeIngredient {
  const text = raw.trim();
  const match = text.match(AMOUNT_UNIT_NAME);

  if (match) {
    const [, amountRaw, unitRaw, nameRaw] = match;
    const amount = parseAmount(amountRaw);
    const normalizedUnit = unitRaw ? UNIT_ALIASES[unitRaw.toLowerCase()] : undefined;

    if (amount !== null) {
      // "2 onions" — no recognised unit word, so the "unit" is really part of
      // the name (e.g. an adjective) and this is a plain count.
      if (unitRaw && !normalizedUnit) {
        return { name: `${unitRaw} ${nameRaw}`.trim(), amount, unit: null };
      }
      return { name: nameRaw, amount, unit: normalizedUnit ?? null };
    }
  }

  return { name: text, amount: null, unit: null };
}

function parseRawIngredient(raw: RawIngredient): ShoppingIngredient {
  if (typeof raw === "string") {
    return { ...parseLegacyIngredientLine(raw), purchased: false };
  }
  return { ...parseLegacyIngredientLine(raw.name), purchased: raw.purchased ?? false };
}

function placeholderSteps(): RecipeStep[] {
  return [{ order: 0, text: "Imported from the legacy app — add the method here." }];
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function resolveDatabaseUrl() {
  const migrateEnv = process.env.PANTRI_MIGRATE_ENV;
  if (migrateEnv === "prod") loadEnvFile(".env.migrate.prod");
  else if (migrateEnv === "dev") loadEnvFile(".env.migrate.dev");
  else if (migrateEnv !== "local") loadEnvFile(".env.migrate.dev");

  return {
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: pnpm import:firestore <path-to-export.json>");
    process.exitCode = 1;
    return;
  }

  const resolvedPath = resolve(process.cwd(), filePath);
  if (!existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exitCode = 1;
    return;
  }

  const data = JSON.parse(readFileSync(resolvedPath, "utf8")) as LegacyPantriExport;
  if (!data.legacyUid) {
    console.error("Export is missing required field: legacyUid");
    process.exitCode = 1;
    return;
  }

  const { url, authToken } = resolveDatabaseUrl();
  const client = createClient({ url, ...(authToken ? { authToken } : {}) });
  const db = drizzle({ client });

  console.log(`Importing legacy pantry ${data.legacyUid} into ${url}`);

  const [existing] = await db
    .select({ id: pantries.id })
    .from(pantries)
    .where(eq(pantries.legacyFirebaseUid, data.legacyUid))
    .limit(1);

  const pantryId = existing?.id ?? randomUUID();
  const pantryName = data.pantryName?.trim() || "Imported Pantry";

  if (existing) {
    await db.update(pantries).set({ name: pantryName }).where(eq(pantries.id, pantryId));
    console.log(`Found existing pantry ${pantryId}, updating in place.`);
  } else {
    await db.insert(pantries).values({
      id: pantryId,
      name: pantryName,
      legacyFirebaseUid: data.legacyUid,
    });
    console.log(`Created pantry ${pantryId}.`);
  }

  for (const email of data.memberEmails ?? []) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) continue;

    const [alreadyMember] = await db
      .select({ id: pantryMembers.id })
      .from(pantryMembers)
      .where(and(eq(pantryMembers.pantryId, pantryId), eq(pantryMembers.email, normalizedEmail)))
      .limit(1);

    if (!alreadyMember) {
      await db.insert(pantryMembers).values({ pantryId, email: normalizedEmail });
    }
  }
  console.log(`Ensured ${data.memberEmails?.length ?? 0} pending member(s) by email.`);

  // This script is meant to be run once per export, so it replaces existing
  // domain rows for the pantry rather than trying to diff/merge them.
  await db.delete(recipes).where(eq(recipes.pantryId, pantryId));
  await db.delete(shoppingRecipes).where(eq(shoppingRecipes.pantryId, pantryId));
  await db.delete(oddBits).where(eq(oddBits.pantryId, pantryId));
  await db.delete(ingredientCategories).where(eq(ingredientCategories.pantryId, pantryId));

  const legacyRecipeIdToNewId = new Map<string, string>();

  for (const recipe of data.recipes ?? []) {
    const id = randomUUID();
    legacyRecipeIdToNewId.set(recipe.id, id);

    const ingredients = recipe.ingredients.map((line) => parseLegacyIngredientLine(line));

    await db.insert(recipes).values({
      id,
      pantryId,
      name: recipe.name,
      link: recipe.link ?? null,
      ingredients: serializeRecipeIngredients(ingredients),
      steps: serializeRecipeSteps(placeholderSteps()),
    });
  }
  console.log(`Imported ${data.recipes?.length ?? 0} recipe(s).`);

  for (const shoppingRecipe of data.shoppingList ?? []) {
    const ingredients = shoppingRecipe.ingredients.map(parseRawIngredient);

    await db.insert(shoppingRecipes).values({
      id: randomUUID(),
      pantryId,
      sourceRecipeId: legacyRecipeIdToNewId.get(shoppingRecipe.id) ?? null,
      name: shoppingRecipe.name,
      link: shoppingRecipe.link ?? null,
      ingredients: serializeShoppingIngredients(ingredients),
      steps: serializeRecipeSteps([]),
    });
  }
  console.log(`Imported ${data.shoppingList?.length ?? 0} shopping-list recipe(s).`);

  if (data.oddBits?.length) {
    const ingredients = data.oddBits.map(parseRawIngredient);
    await db.insert(oddBits).values({
      pantryId,
      ingredients: serializeShoppingIngredients(ingredients),
    });
  }
  console.log(`Imported ${data.oddBits?.length ?? 0} odd bit(s).`);

  const categoryEntries = Object.entries(data.ingredientCategories ?? {});
  for (const [canonicalName, section] of categoryEntries) {
    await db.insert(ingredientCategories).values({
      pantryId,
      canonicalName,
      section,
    });
  }
  console.log(`Imported ${categoryEntries.length} ingredient category override(s).`);

  client.close();
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
