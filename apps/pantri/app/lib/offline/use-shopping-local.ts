import { startTransition, useCallback, useEffect, useRef, useState } from "react";

import { applyOutboxToSnapshot } from "~/lib/offline/apply-outbox";
import { subscribeShoppingOfflineChange } from "~/lib/offline/events";
import { listOutbox } from "~/lib/offline/outbox";
import { readShoppingSnapshot, writeShoppingSnapshot } from "~/lib/offline/snapshot";
import {
  deserializeShoppingRecipes,
  type OutboxEntry,
  type ShoppingSnapshot,
} from "~/lib/offline/types";
import type { OddBit } from "~/lib/recipe-schema";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

export type ShoppingLocalState = {
  recipes: ShoppingRecipeRecord[];
  oddBits: OddBit[];
  outbox: OutboxEntry[];
  categoryOverrides: ShoppingSnapshot["categoryOverrides"];
  ready: boolean;
};

type Seed = {
  recipes: ShoppingRecipeRecord[];
  oddBits: OddBit[];
  categoryOverrides?: ShoppingSnapshot["categoryOverrides"];
};

/**
 * Local-first shopping view: snapshot base + undrained outbox.
 * Local mutation refreshes are urgent; server-pull refreshes use startTransition
 * so checkbox toggles are not blocked by loader data commits.
 */
export function useShoppingLocalState(pantryId: string, seed: Seed): ShoppingLocalState {
  const seedRef = useRef(seed);
  seedRef.current = seed;

  const [state, setState] = useState<ShoppingLocalState>({
    recipes: seed.recipes,
    oddBits: seed.oddBits,
    outbox: [],
    categoryOverrides: seed.categoryOverrides ?? {},
    ready: false,
  });

  const refresh = useCallback(async (priority: "urgent" | "transition" = "urgent") => {
    const seedNow = seedRef.current;
    const outbox = await listOutbox(pantryId);
    let snap = await readShoppingSnapshot(pantryId);

    // Seed IDB only when empty and there is nothing queued — otherwise seed may
    // already be applied (base+outbox) and re-applying would duplicate rows.
    if (!snap && outbox.length === 0) {
      await writeShoppingSnapshot(pantryId, {
        shoppingRecipes: seedNow.recipes,
        oddBits: seedNow.oddBits,
        categoryOverrides: seedNow.categoryOverrides,
      });
      snap = await readShoppingSnapshot(pantryId);
    }

    const next: ShoppingLocalState = !snap
      ? {
          recipes: seedNow.recipes,
          oddBits: seedNow.oddBits,
          outbox,
          categoryOverrides: seedNow.categoryOverrides ?? {},
          ready: true,
        }
      : (() => {
          const applied = applyOutboxToSnapshot(snap, outbox);
          return {
            recipes: deserializeShoppingRecipes(applied.shoppingRecipes),
            oddBits: applied.oddBits,
            outbox,
            categoryOverrides: applied.categoryOverrides,
            ready: true,
          };
        })();

    if (priority === "transition") {
      startTransition(() => setState(next));
    } else {
      setState(next);
    }
  }, [pantryId]);

  useEffect(() => {
    void refresh("urgent");
    return subscribeShoppingOfflineChange((detail) => {
      void refresh(detail.priority === "transition" ? "transition" : "urgent");
    });
  }, [refresh]);

  return state;
}
