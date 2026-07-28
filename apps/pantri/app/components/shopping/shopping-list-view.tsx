import { ArrowRightLeft, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useFetcher, useFetchers } from "react-router";

import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { ShoppingGotItSection } from "~/components/shopping/shopping-got-it-section";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { pantryPath } from "~/lib/pantry-path";
import type { ShoppingIngredient } from "~/lib/recipe-schema";
import { applyShoppingListOptimistic, type OptimisticOddBit } from "~/lib/shopping-optimistic";
import { splitIndexedByPurchased } from "~/lib/split-purchased";
import { cn } from "~/lib/utils";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

function IngredientCheckbox({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50">
      <input
        checked={checked}
        className="size-4 shrink-0 accent-foreground"
        onChange={(event) => onToggle(event.target.checked)}
        type="checkbox"
      />
      <span className={cn(checked && "text-muted-foreground line-through")}>{label}</span>
    </label>
  );
}

function formatIngredientLabel(ingredient: {
  name: string;
  amount: number | null;
  unit: string | null;
  notes?: string;
}) {
  const quantity = [ingredient.amount ?? undefined, ingredient.unit ?? undefined]
    .filter((part) => part !== undefined && part !== "")
    .join("");
  const parts = [quantity, ingredient.name].filter(Boolean);
  const label = parts.join(" ");
  return ingredient.notes ? `${label} (${ingredient.notes})` : label;
}

function RecipeIngredientRow({
  action,
  recipeId,
  index,
  ingredient,
}: {
  action: string;
  recipeId: string;
  index: number;
  ingredient: ShoppingIngredient;
}) {
  const fetcher = useFetcher({ key: `shopping-toggle-ingredient:${recipeId}:${index}` });
  const checked =
    fetcher.formData?.get("intent") === "toggle-ingredient"
      ? fetcher.formData.get("purchased") === "true"
      : ingredient.purchased;

  return (
    <IngredientCheckbox
      checked={checked}
      label={formatIngredientLabel(ingredient)}
      onToggle={(next) => {
        fetcher.submit(
          {
            intent: "toggle-ingredient",
            shoppingRecipeId: recipeId,
            ingredientIndex: String(index),
            purchased: String(next),
          },
          { method: "post", action },
        );
      }}
    />
  );
}

function OddBitRow({ action, bit }: { action: string; bit: OptimisticOddBit }) {
  const index = bit.sourceIndex;
  const toggleFetcher = useFetcher({
    key: bit.pendingAdd
      ? `shopping-toggle-odd-bit:pending:${bit.name}`
      : `shopping-toggle-odd-bit:${index}`,
  });
  const removeFetcher = useFetcher({
    key: bit.pendingAdd
      ? `shopping-remove-odd-bit:pending:${bit.name}`
      : `shopping-remove-odd-bit:${index}`,
  });
  const checked =
    toggleFetcher.formData?.get("intent") === "toggle-odd-bit"
      ? toggleFetcher.formData.get("purchased") === "true"
      : bit.purchased;

  return (
    <div className="flex items-center gap-1">
      <div className="flex-1">
        <IngredientCheckbox
          checked={checked}
          label={formatIngredientLabel(bit)}
          onToggle={(next) => {
            if (bit.pendingAdd) return;
            toggleFetcher.submit(
              {
                intent: "toggle-odd-bit",
                index: String(index),
                purchased: String(next),
              },
              { method: "post", action },
            );
          }}
        />
      </div>
      {bit.pendingAdd ? null : (
        <removeFetcher.Form action={action} method="post">
          <input name="intent" type="hidden" value="remove-odd-bit" />
          <input name="index" type="hidden" value={index} />
          <Button aria-label="Remove odd bit" size="icon" type="submit" variant="ghost">
            <Trash2 className="size-4" />
          </Button>
        </removeFetcher.Form>
      )}
    </div>
  );
}

export type ShoppingListViewProps = {
  recipes: ShoppingRecipeRecord[];
  oddBits: ShoppingIngredient[];
  pantryId: string;
};

export function ShoppingListView({ recipes, oddBits, pantryId }: ShoppingListViewProps) {
  const action = pantryPath(pantryId, "shopping");
  const fetchers = useFetchers();
  const addOddBitFetcher = useFetcher({ key: "shopping-add-odd-bit" });
  const clearOddBitsFetcher = useFetcher({ key: "shopping-clear-odd-bits" });
  const addOddBitFormRef = useRef<HTMLFormElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const { recipes: optimisticRecipes, oddBits: optimisticOddBits } = useMemo(
    () => applyShoppingListOptimistic(recipes, oddBits, fetchers),
    [recipes, oddBits, fetchers],
  );

  function toggleExpanded(recipeId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
  }

  const { toBuy: oddBitsToBuy, gotIt: oddBitsGotIt } = splitIndexedByPurchased(optimisticOddBits);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to={pantryPath(pantryId, "shopping/sorted")}>
              <ArrowRightLeft className="size-4" />
              Sort Shopping
            </Link>
          </Button>
        }
        description="Grouped by recipe. Check off what you've got."
        title="Shopping list"
      />

      <Card>
        <CardHeader>
          <CardTitle className="uppercase tracking-[0.06em]">Odd bits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {optimisticOddBits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Things you need that aren't part of a recipe — a few odds and ends.
            </p>
          ) : (
            <>
              {oddBitsToBuy.length > 0 ? (
                <div>
                  {oddBitsToBuy.map(({ item: bit }) => (
                    <OddBitRow
                      action={action}
                      bit={bit}
                      key={
                        bit.pendingAdd
                          ? `odd-bit-pending-${bit.name}`
                          : `odd-bit-${bit.sourceIndex}-${bit.name}`
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="px-2 text-sm text-muted-foreground">
                  All done — nothing left to buy.
                </p>
              )}

              {oddBitsGotIt.length > 0 ? (
                <ShoppingGotItSection
                  count={oddBitsGotIt.length}
                  onResetAll={() => {
                    clearOddBitsFetcher.submit(
                      { intent: "clear-odd-bits-purchased" },
                      { method: "post", action },
                    );
                  }}
                >
                  {oddBitsGotIt.map(({ item: bit }) => (
                    <OddBitRow
                      action={action}
                      bit={bit}
                      key={`odd-bit-got-${bit.sourceIndex}-${bit.name}`}
                    />
                  ))}
                </ShoppingGotItSection>
              ) : null}
            </>
          )}

          <addOddBitFetcher.Form
            action={action}
            className="flex flex-wrap items-end gap-2"
            method="post"
            onSubmit={() => {
              requestAnimationFrame(() => addOddBitFormRef.current?.reset());
            }}
            ref={addOddBitFormRef}
          >
            <input name="intent" type="hidden" value="add-odd-bit" />
            <Input
              aria-label="Amount"
              className="w-20"
              inputMode="decimal"
              name="amount"
              placeholder="Amt"
            />
            <Input aria-label="Unit" className="w-20" name="unit" placeholder="Unit" />
            <Input
              aria-label="Name"
              className="min-w-32 flex-1"
              name="name"
              placeholder="e.g. paper towels"
              required
            />
            <Button size="sm" type="submit">
              <Plus className="size-4" /> Add
            </Button>
          </addOddBitFetcher.Form>
        </CardContent>
      </Card>

      {optimisticRecipes.length === 0 && optimisticOddBits.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Your shopping list is empty. Add a recipe from the Recipes page, or add an odd bit
            below.
          </CardContent>
        </Card>
      ) : null}

      {optimisticRecipes.map((recipe) => {
        const expanded = expandedIds.has(recipe.id);
        const { toBuy, gotIt } = splitIndexedByPurchased(recipe.ingredients);
        const remaining = toBuy.length;
        const panelId = `shopping-recipe-${recipe.id}`;

        return (
          <RecipeCard
            action={action}
            expanded={expanded}
            gotIt={gotIt}
            key={recipe.id}
            onToggleExpanded={() => toggleExpanded(recipe.id)}
            panelId={panelId}
            recipe={recipe}
            remaining={remaining}
            toBuy={toBuy}
          />
        );
      })}
    </div>
  );
}

function RecipeCard({
  action,
  recipe,
  expanded,
  panelId,
  remaining,
  toBuy,
  gotIt,
  onToggleExpanded,
}: {
  action: string;
  recipe: ShoppingRecipeRecord;
  expanded: boolean;
  panelId: string;
  remaining: number;
  toBuy: { item: ShoppingIngredient; index: number }[];
  gotIt: { item: ShoppingIngredient; index: number }[];
  onToggleExpanded: () => void;
}) {
  const clearFetcher = useFetcher({ key: `shopping-clear-recipe:${recipe.id}` });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4">
        <button
          aria-controls={panelId}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onToggleExpanded}
          type="button"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              !expanded && "-rotate-90",
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold uppercase tracking-[0.06em]">
              {recipe.name}
            </span>
            {!expanded ? (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {remaining === 0
                  ? "All got"
                  : `${remaining} left · ${recipe.ingredients.length} total`}
              </span>
            ) : null}
          </span>
        </button>
        <RemoveRecipeButton action={action} recipeId={recipe.id} recipeName={recipe.name} />
      </CardHeader>
      {expanded ? (
        <CardContent className="space-y-1 pt-0" id={panelId}>
          {recipe.ingredients.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">No ingredients</p>
          ) : (
            <>
              {toBuy.length > 0 ? (
                toBuy.map(({ item, index }) => (
                  <RecipeIngredientRow
                    action={action}
                    index={index}
                    ingredient={item}
                    key={`${recipe.id}-${index}`}
                    recipeId={recipe.id}
                  />
                ))
              ) : (
                <p className="px-2 text-sm text-muted-foreground">
                  All done — nothing left to buy.
                </p>
              )}

              {gotIt.length > 0 ? (
                <ShoppingGotItSection
                  count={gotIt.length}
                  onResetAll={() => {
                    clearFetcher.submit(
                      { intent: "clear-recipe-purchased", shoppingRecipeId: recipe.id },
                      { method: "post", action },
                    );
                  }}
                >
                  {gotIt.map(({ item, index }) => (
                    <RecipeIngredientRow
                      action={action}
                      index={index}
                      ingredient={item}
                      key={`${recipe.id}-got-${index}`}
                      recipeId={recipe.id}
                    />
                  ))}
                </ShoppingGotItSection>
              ) : null}
            </>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

function RemoveRecipeButton({
  action,
  recipeId,
  recipeName,
}: {
  action: string;
  recipeId: string;
  recipeName: string;
}) {
  const fetcher = useFetcher({ key: `shopping-remove-recipe:${recipeId}` });

  return (
    <fetcher.Form action={action} method="post">
      <input name="intent" type="hidden" value="remove-recipe" />
      <input name="shoppingRecipeId" type="hidden" value={recipeId} />
      <Button
        aria-label={`Remove ${recipeName} from shopping list`}
        size="icon"
        type="submit"
        variant="ghost"
      >
        <Trash2 className="size-4" />
      </Button>
    </fetcher.Form>
  );
}
