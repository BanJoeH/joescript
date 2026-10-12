import { getCanonicalIngredientName } from "~/lib/ingredient-name";
import type { OutboxEntry } from "~/lib/offline/types";

/** Keep just-folded purchased flags briefly so a stale SSE/focus pull can't clobber them. */
const FOLD_PROTECTION_TTL_MS = 30_000;

type Protection = {
  oddBitIds: Set<string>;
  ingredientNames: Set<string>;
  ingredientKeys: Set<string>;
  /** clear-odd-bits-purchased / clear-all — protect every purchased flag. */
  all: boolean;
};

const recentFolds: { entry: OutboxEntry; until: number }[] = [];

export function resetPurchasedProtectionForTests() {
  recentFolds.length = 0;
}

/** Record a successfully drained entry so pull-merge still prefers its purchased flags briefly. */
export function rememberFoldedPurchasedProtection(entry: OutboxEntry) {
  const now = Date.now();
  for (let i = recentFolds.length - 1; i >= 0; i--) {
    if ((recentFolds[i]?.until ?? 0) <= now) recentFolds.splice(i, 1);
  }
  recentFolds.push({ entry, until: now + FOLD_PROTECTION_TTL_MS });
}

function addEntryToProtection(protection: Protection, entry: OutboxEntry) {
  const intent = entry.fields.intent ?? "";

  if (intent === "toggle-odd-bit") {
    const id = (entry.fields.id ?? "").trim();
    if (id) protection.oddBitIds.add(id);
    return;
  }

  if (intent === "clear-odd-bits-purchased" || intent === "clear-all-purchased") {
    protection.all = true;
    return;
  }

  if (intent === "toggle") {
    const name = (entry.fields.name ?? "").trim();
    if (name) protection.ingredientNames.add(getCanonicalIngredientName(name));
    return;
  }

  if (intent === "toggle-ingredient") {
    const recipeId = (entry.fields.shoppingRecipeId ?? "").trim();
    const ingredientId = (entry.fields.ingredientId ?? "").trim();
    if (recipeId && ingredientId) {
      protection.ingredientKeys.add(`${recipeId}:${ingredientId}`);
    }
    return;
  }

  if (intent === "clear-recipe-purchased") {
    const recipeId = (entry.fields.shoppingRecipeId ?? "").trim();
    if (recipeId) protection.ingredientKeys.add(`${recipeId}:*`);
  }
}

export function purchasedProtectionFromOutbox(entries: OutboxEntry[]): Protection {
  const protection: Protection = {
    oddBitIds: new Set(),
    ingredientNames: new Set(),
    ingredientKeys: new Set(),
    all: false,
  };

  for (const entry of entries) {
    if (entry.status !== "pending") continue;
    addEntryToProtection(protection, entry);
  }

  const now = Date.now();
  for (const fold of recentFolds) {
    if (fold.until <= now) continue;
    addEntryToProtection(protection, { ...fold.entry, status: "pending" });
  }

  return protection;
}

export function isOddBitPurchasedProtected(protection: Protection, oddBitId: string) {
  return protection.all || protection.oddBitIds.has(oddBitId);
}

export function isIngredientPurchasedProtected(
  protection: Protection,
  input: { recipeId: string; ingredientId: string; name: string },
) {
  if (protection.all) return true;
  if (protection.ingredientKeys.has(`${input.recipeId}:${input.ingredientId}`)) return true;
  if (protection.ingredientKeys.has(`${input.recipeId}:*`)) return true;
  return protection.ingredientNames.has(getCanonicalIngredientName(input.name));
}
