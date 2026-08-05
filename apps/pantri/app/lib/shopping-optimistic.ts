import type { ShoppingSection } from "~/lib/ingredient-sections";
import type { ShoppingIngredient } from "~/lib/recipe-schema";
import type { AggregatedIngredient } from "~/lib/shopping-aggregation";
import { applyShoppingPurchasedOverrides } from "~/lib/shopping-purchased-overrides";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

type FetcherLike = {
  formData?: FormData | null;
};

function readFormData(fetchers: FetcherLike[]): FormData[] {
  return fetchers
    .map((fetcher) => fetcher.formData)
    .filter((formData): formData is FormData => formData != null);
}

export type OptimisticOddBit = ShoppingIngredient & {
  /** Index used by the shopping action API (stable across optimistic removes). */
  sourceIndex: number;
  pendingAdd?: boolean;
};

export function applyShoppingListOptimistic(
  recipes: ShoppingRecipeRecord[],
  oddBits: ShoppingIngredient[],
  fetchers: FetcherLike[],
): { recipes: ShoppingRecipeRecord[]; oddBits: OptimisticOddBit[] } {
  const withOverrides = applyShoppingPurchasedOverrides(recipes, oddBits);
  let nextRecipes = withOverrides.recipes;
  let nextOddBits: OptimisticOddBit[] = withOverrides.oddBits.map((bit, sourceIndex) => ({
    ...bit,
    sourceIndex,
  }));

  for (const formData of readFormData(fetchers)) {
    const intent = String(formData.get("intent") ?? "");

    if (intent === "toggle-ingredient") {
      const shoppingRecipeId = String(formData.get("shoppingRecipeId") ?? "");
      const ingredientIndex = Number(formData.get("ingredientIndex"));
      const purchased = formData.get("purchased") === "true";
      if (!shoppingRecipeId || !Number.isFinite(ingredientIndex)) continue;

      nextRecipes = nextRecipes.map((recipe) => {
        if (recipe.id !== shoppingRecipeId) return recipe;
        return {
          ...recipe,
          ingredients: recipe.ingredients.map((ingredient, index) =>
            index === ingredientIndex ? { ...ingredient, purchased } : ingredient,
          ),
        };
      });
      continue;
    }

    if (intent === "remove-recipe") {
      const shoppingRecipeId = String(formData.get("shoppingRecipeId") ?? "");
      if (!shoppingRecipeId) continue;
      nextRecipes = nextRecipes.filter((recipe) => recipe.id !== shoppingRecipeId);
      continue;
    }

    if (intent === "toggle-odd-bit") {
      const index = Number(formData.get("index"));
      const purchased = formData.get("purchased") === "true";
      if (!Number.isFinite(index)) continue;
      nextOddBits = nextOddBits.map((bit) =>
        bit.sourceIndex === index ? { ...bit, purchased } : bit,
      );
      continue;
    }

    if (intent === "remove-odd-bit") {
      const index = Number(formData.get("index"));
      if (!Number.isFinite(index)) continue;
      nextOddBits = nextOddBits.filter((bit) => bit.sourceIndex !== index);
      continue;
    }

    if (intent === "add-odd-bit") {
      const name = String(formData.get("name") ?? "").trim();
      if (!name) continue;
      const amountRaw = String(formData.get("amount") ?? "").trim();
      const amount = amountRaw ? Number(amountRaw) : null;
      const unitRaw = String(formData.get("unit") ?? "").trim();
      const notesRaw = String(formData.get("notes") ?? "").trim();
      nextOddBits = [
        ...nextOddBits,
        {
          name,
          amount: amount != null && Number.isFinite(amount) ? amount : null,
          unit: unitRaw || null,
          notes: notesRaw || undefined,
          purchased: false,
          sourceIndex: -1,
          pendingAdd: true,
        },
      ];
      continue;
    }

    if (intent === "clear-recipe-purchased") {
      const shoppingRecipeId = String(formData.get("shoppingRecipeId") ?? "");
      if (!shoppingRecipeId) continue;
      nextRecipes = nextRecipes.map((recipe) => {
        if (recipe.id !== shoppingRecipeId) return recipe;
        return {
          ...recipe,
          ingredients: recipe.ingredients.map((ingredient) =>
            ingredient.purchased ? { ...ingredient, purchased: false } : ingredient,
          ),
        };
      });
      continue;
    }

    if (intent === "clear-odd-bits-purchased") {
      nextOddBits = nextOddBits.map((bit) => (bit.purchased ? { ...bit, purchased: false } : bit));
    }
  }

  return { recipes: nextRecipes, oddBits: nextOddBits };
}

export type SortedSection = {
  section: ShoppingSection | string;
  items: AggregatedIngredient[];
};

export function applySortedOptimistic(
  sections: SortedSection[],
  fetchers: FetcherLike[],
): SortedSection[] {
  let next = sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item })),
  }));

  for (const formData of readFormData(fetchers)) {
    const intent = String(formData.get("intent") ?? "");

    if (intent === "toggle") {
      const name = String(formData.get("name") ?? "");
      const purchased = formData.get("purchased") === "true";
      if (!name) continue;
      next = next.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          item.name === name || item.canonicalName === name.toLowerCase()
            ? { ...item, purchased }
            : item,
        ),
      }));
      continue;
    }

    if (intent === "set-category") {
      const name = String(formData.get("name") ?? "");
      const targetSection = String(formData.get("section") ?? "");
      if (!name || !targetSection) continue;

      let moved: AggregatedIngredient | null = null;
      next = next.map((section) => {
        const remaining = section.items.filter((item) => {
          const match = item.name === name || item.canonicalName === name.toLowerCase();
          if (match) moved = item;
          return !match;
        });
        return { ...section, items: remaining };
      });

      if (!moved) continue;

      const existing = next.find((section) => section.section === targetSection);
      if (existing) {
        existing.items = [...existing.items, moved];
      } else {
        next = [...next, { section: targetSection, items: [moved] }];
      }
      next = next.filter((section) => section.items.length > 0);
      continue;
    }

    if (intent === "clear-all-purchased") {
      next = next.map((section) => ({
        ...section,
        items: section.items.map((item) => (item.purchased ? { ...item, purchased: false } : item)),
      }));
    }
  }

  return next;
}
