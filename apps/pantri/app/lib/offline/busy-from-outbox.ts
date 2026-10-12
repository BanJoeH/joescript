import type { OutboxEntry } from "~/lib/offline/types";
import {
  type ShoppingBusySets,
  type SortedBusySets,
  shoppingBusyFromFetchers,
  sortedBusyFromFetchers,
} from "~/lib/shopping-local-merge";

/** Treat pending outbox rows like in-flight fetcher formData for merge busy sets. */
export function shoppingBusyFromOutbox(entries: OutboxEntry[]): ShoppingBusySets {
  return shoppingBusyFromFetchers(
    entries
      .filter((entry) => entry.status === "pending")
      .map((entry) => {
        const formData = new FormData();
        for (const [key, value] of Object.entries(entry.fields)) {
          formData.set(key, value);
        }
        return { formData };
      }),
  );
}

export function sortedBusyFromOutbox(entries: OutboxEntry[]): SortedBusySets {
  return sortedBusyFromFetchers(
    entries
      .filter((entry) => entry.status === "pending")
      .map((entry) => {
        const formData = new FormData();
        for (const [key, value] of Object.entries(entry.fields)) {
          formData.set(key, value);
        }
        return { formData };
      }),
  );
}

export function unionShoppingBusy(a: ShoppingBusySets, b: ShoppingBusySets): ShoppingBusySets {
  return {
    ingredientKeys: new Set([...a.ingredientKeys, ...b.ingredientKeys]),
    oddBitIds: new Set([...a.oddBitIds, ...b.oddBitIds]),
    oddBitRemoves: new Set([...a.oddBitRemoves, ...b.oddBitRemoves]),
    recipeRemoves: new Set([...a.recipeRemoves, ...b.recipeRemoves]),
    recipeClears: new Set([...a.recipeClears, ...b.recipeClears]),
    oddBitClears: a.oddBitClears || b.oddBitClears,
  };
}

export function unionSortedBusy(a: SortedBusySets, b: SortedBusySets): SortedBusySets {
  return {
    toggles: new Set([...a.toggles, ...b.toggles]),
    moves: new Set([...a.moves, ...b.moves]),
    clearAll: a.clearAll || b.clearAll,
  };
}
