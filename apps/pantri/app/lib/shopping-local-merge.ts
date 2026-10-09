import { getCanonicalIngredientName } from "~/lib/ingredient-name";
import type { ShoppingSection } from "~/lib/ingredient-sections";
import type { OddBit } from "~/lib/recipe-schema";
import type { AggregatedIngredient } from "~/lib/shopping-aggregation";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

export type ShoppingBusySets = {
  ingredientKeys: Set<string>;
  oddBitIds: Set<string>;
  oddBitRemoves: Set<string>;
  recipeRemoves: Set<string>;
  recipeClears: Set<string>;
  oddBitClears: boolean;
};

export function ingredientBusyKey(recipeId: string, ingredientId: string) {
  return `${recipeId}:${ingredientId}`;
}

export const SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX = "shopping-add-odd-bit:";

type FetcherLike = {
  key?: string;
  state?: string;
  formData?: FormData | null;
  data?: unknown;
};

/** Collect entity keys that currently have an in-flight shopping mutation. */
export function shoppingBusyFromFetchers(fetchers: FetcherLike[]): ShoppingBusySets {
  const ingredientKeys = new Set<string>();
  const oddBitIds = new Set<string>();
  const oddBitRemoves = new Set<string>();
  const recipeRemoves = new Set<string>();
  const recipeClears = new Set<string>();
  let oddBitClears = false;

  for (const fetcher of fetchers) {
    const formData = fetcher.formData;
    if (!formData) continue;
    const intent = String(formData.get("intent") ?? "");

    if (intent === "toggle-ingredient") {
      const recipeId = String(formData.get("shoppingRecipeId") ?? "");
      const ingredientId = String(formData.get("ingredientId") ?? "");
      if (recipeId && ingredientId) {
        ingredientKeys.add(ingredientBusyKey(recipeId, ingredientId));
      }
      continue;
    }

    if (intent === "remove-recipe") {
      const recipeId = String(formData.get("shoppingRecipeId") ?? "");
      if (recipeId) recipeRemoves.add(recipeId);
      continue;
    }

    if (intent === "clear-recipe-purchased") {
      const recipeId = String(formData.get("shoppingRecipeId") ?? "");
      if (recipeId) recipeClears.add(recipeId);
      continue;
    }

    if (intent === "toggle-odd-bit") {
      const id = String(formData.get("id") ?? "");
      if (id) oddBitIds.add(id);
      continue;
    }

    if (intent === "remove-odd-bit") {
      const id = String(formData.get("id") ?? "");
      if (id) oddBitRemoves.add(id);
      continue;
    }

    if (intent === "clear-odd-bits-purchased") {
      oddBitClears = true;
    }
  }

  return {
    ingredientKeys,
    oddBitIds,
    oddBitRemoves,
    recipeRemoves,
    recipeClears,
    oddBitClears,
  };
}

export function mergeShoppingRecipes(
  server: ShoppingRecipeRecord[],
  local: ShoppingRecipeRecord[],
  busy: ShoppingBusySets,
): ShoppingRecipeRecord[] {
  const localById = new Map(local.map((recipe) => [recipe.id, recipe]));

  return server
    .filter((recipe) => !busy.recipeRemoves.has(recipe.id))
    .map((serverRecipe) => {
      const localRecipe = localById.get(serverRecipe.id);
      if (!localRecipe) return serverRecipe;

      if (busy.recipeClears.has(serverRecipe.id)) {
        return localRecipe;
      }

      const ingredients = serverRecipe.ingredients.map((serverIngredient) => {
        const key = ingredientBusyKey(serverRecipe.id, serverIngredient.id);
        if (!busy.ingredientKeys.has(key)) return serverIngredient;
        return (
          localRecipe.ingredients.find((ingredient) => ingredient.id === serverIngredient.id) ??
          serverIngredient
        );
      });

      return { ...serverRecipe, ingredients };
    });
}

export function isPendingOddBitId(id: string) {
  return id.startsWith("pending:");
}

export function mergeOddBits(server: OddBit[], local: OddBit[], busy: ShoppingBusySets): OddBit[] {
  const localById = new Map(local.map((bit) => [bit.id, bit]));
  const serverIds = new Set(server.map((bit) => bit.id));

  const mergedServer = server
    .filter((bit) => !busy.oddBitRemoves.has(bit.id))
    .map((serverBit) => {
      if (busy.oddBitClears || busy.oddBitIds.has(serverBit.id)) {
        return localById.get(serverBit.id) ?? serverBit;
      }
      return serverBit;
    });

  // Local-only rows (e.g. overlays) that have not landed in loader data yet.
  const localOnly = local.filter(
    (bit) => !serverIds.has(bit.id) && !busy.oddBitRemoves.has(bit.id),
  );

  return [...mergedServer, ...localOnly];
}

/**
 * Derive in-flight / just-settled odd-bit adds from fetchers so the UI does not
 * need to copy pending rows into local state.
 */
export function oddBitsFromAddFetchers(fetchers: FetcherLike[], server: OddBit[]): OddBit[] {
  const serverIds = new Set(server.map((bit) => bit.id));
  const byId = new Map<string, OddBit>();

  for (const fetcher of fetchers) {
    const keyedAdd = fetcher.key?.startsWith(SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX) ?? false;
    const formData = fetcher.formData;
    const intent = formData ? String(formData.get("intent") ?? "") : "";

    if (formData && intent === "add-odd-bit") {
      const name = String(formData.get("name") ?? "").trim();
      const id = String(formData.get("clientPendingId") ?? "").trim();
      if (!name || !id) continue;
      const amountRaw = String(formData.get("amount") ?? "").trim();
      const unitRaw = String(formData.get("unit") ?? "").trim();
      byId.set(id, {
        id,
        name,
        amount: amountRaw ? Number(amountRaw) : null,
        unit: unitRaw || null,
        purchased: false,
      });
      continue;
    }

    if (!keyedAdd && intent !== "add-odd-bit") continue;
    if (fetcher.state !== "idle" || fetcher.data == null || typeof fetcher.data !== "object") {
      continue;
    }
    if (!("oddBit" in fetcher.data)) continue;
    const oddBit = (fetcher.data as { oddBit?: OddBit }).oddBit;
    if (!oddBit || serverIds.has(oddBit.id)) continue;
    byId.set(oddBit.id, oddBit);
  }

  return [...byId.values()];
}

export type SortedBusySets = {
  toggles: Set<string>;
  moves: Set<string>;
  clearAll: boolean;
};

export function sortedBusyFromFetchers(fetchers: FetcherLike[]): SortedBusySets {
  const toggles = new Set<string>();
  const moves = new Set<string>();
  let clearAll = false;

  for (const fetcher of fetchers) {
    const formData = fetcher.formData;
    if (!formData) continue;
    const intent = String(formData.get("intent") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const canonical = name ? getCanonicalIngredientName(name) : "";

    if (intent === "toggle" && canonical) {
      toggles.add(canonical);
      continue;
    }
    if (intent === "set-category" && canonical) {
      moves.add(canonical);
      continue;
    }
    if (intent === "clear-all-purchased") {
      clearAll = true;
    }
  }

  return { toggles, moves, clearAll };
}

export type SortedSectionState = { section: ShoppingSection; items: AggregatedIngredient[] };

/**
 * Prefer server sections, but keep local purchased/section for items with
 * in-flight toggles or aisle moves. Clear-all keeps the local snapshot.
 */
export function mergeSortedSections(
  server: SortedSectionState[],
  local: SortedSectionState[],
  busy: SortedBusySets,
): SortedSectionState[] {
  if (busy.clearAll) {
    return local;
  }

  if (busy.toggles.size === 0 && busy.moves.size === 0) {
    return server;
  }

  const localByCanonical = new Map<
    string,
    { item: AggregatedIngredient; section: ShoppingSection }
  >();
  for (const section of local) {
    for (const item of section.items) {
      localByCanonical.set(item.canonicalName, { item, section: section.section });
    }
  }

  const next = server.map((section) => ({
    ...section,
    items: [] as AggregatedIngredient[],
  }));

  const ensureSection = (sectionName: ShoppingSection) => {
    let existing = next.find((section) => section.section === sectionName);
    if (!existing) {
      existing = { section: sectionName, items: [] };
      next.push(existing);
    }
    return existing;
  };

  for (const section of server) {
    for (const serverItem of section.items) {
      const busyToggle = busy.toggles.has(serverItem.canonicalName);
      const busyMove = busy.moves.has(serverItem.canonicalName);
      const localEntry = localByCanonical.get(serverItem.canonicalName);

      if ((busyToggle || busyMove) && localEntry) {
        ensureSection(localEntry.section).items.push(localEntry.item);
        continue;
      }
      ensureSection(section.section).items.push(serverItem);
    }
  }

  return next.filter((section) => section.items.length > 0);
}
