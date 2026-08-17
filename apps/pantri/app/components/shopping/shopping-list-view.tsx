import {
  ArrowRightLeft,
  ChevronDown,
  ExternalLink,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useFetcher, useFetchers } from "react-router";

import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { QuantityInput } from "~/components/recipes/quantity-input";
import { ShoppingGotItSection } from "~/components/shopping/shopping-got-it-section";
import { Button } from "~/components/ui/button";
import { CardList, CardListItem } from "~/components/ui/card-list";
import { Input } from "~/components/ui/input";
import { pantryPath } from "~/lib/pantry-path";
import { markOptimisticShoppingActionSubmitted } from "~/lib/pantry-revalidate";
import type { ShoppingIngredient } from "~/lib/recipe-schema";
import { applyShoppingListOptimistic, type OptimisticOddBit } from "~/lib/shopping-optimistic";
import {
  resetOddBitPurchasedOverrides,
  resetRecipePurchasedOverrides,
  setIngredientPurchasedOverride,
  setOddBitPurchasedOverride,
} from "~/lib/shopping-purchased-overrides";
import { splitIndexedByPurchased } from "~/lib/split-purchased";
import { formatIngredientLabel } from "~/lib/units";
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
    <label className="flex cursor-pointer items-center gap-3 rounded-sm px-1 py-1 text-sm hover:bg-accent/50">
      <input
        checked={checked}
        className="size-4 shrink-0 accent-foreground"
        onChange={(event) => onToggle(event.target.checked)}
        type="checkbox"
      />
      <span className={cn("capitalize", checked && "text-muted-foreground line-through")}>
        {label}
      </span>
    </label>
  );
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
        setIngredientPurchasedOverride(recipeId, index, next);
        markOptimisticShoppingActionSubmitted();
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

function AddOddBitForm({ action }: { action: string }) {
  const fetcher = useFetcher({ key: "shopping-add-odd-bit" });
  const formRef = useRef<HTMLFormElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const [addCycle, setAddCycle] = useState(0);
  const [quantity, setQuantity] = useState<{ amount: number | null; unit: string | null }>({
    amount: null,
    unit: null,
  });

  return (
    <fetcher.Form
      action={action}
      className="flex flex-wrap items-end gap-2"
      method="post"
      onSubmit={() => {
        setQuantity({ amount: null, unit: null });
        setAddCycle((cycle) => cycle + 1);
        requestAnimationFrame(() => {
          formRef.current?.reset();
          quantityInputRef.current?.focus();
        });
      }}
      ref={formRef}
    >
      <input name="intent" type="hidden" value="add-odd-bit" />
      <QuantityInput
        amount={quantity.amount}
        autoFocus={addCycle > 0}
        className="w-28"
        inputRef={quantityInputRef}
        key={`odd-bit-qty-${addCycle}`}
        onChange={setQuantity}
        placeholder="Qty"
        unit={quantity.unit}
      />
      <input name="amount" type="hidden" value={quantity.amount ?? ""} />
      <input name="unit" type="hidden" value={quantity.unit ?? ""} />
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
    </fetcher.Form>
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
            setOddBitPurchasedOverride(index, next);
            markOptimisticShoppingActionSubmitted();
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
  const clearOddBitsFetcher = useFetcher({ key: "shopping-clear-odd-bits" });
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
    <div className="flex flex-col gap-4">
      <PageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to={pantryPath(pantryId, "shopping/sorted")}>
              <ArrowRightLeft className="size-4" />
              Sort
            </Link>
          </Button>
        }
        description="By recipe"
        title="Shopping list"
      />

      <CardList>
        <CardListItem className="px-4 py-3">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.06em]">Odd bits</h3>
          <div className="space-y-2">
            {optimisticOddBits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {optimisticRecipes.length === 0
                  ? "Empty. Add a recipe or an odd bit below."
                  : "Extras that aren't on a recipe."}
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
                  <p className="px-1 text-sm text-muted-foreground">All done.</p>
                )}

                {oddBitsGotIt.length > 0 ? (
                  <ShoppingGotItSection
                    count={oddBitsGotIt.length}
                    onResetAll={() => {
                      resetOddBitPurchasedOverrides(optimisticOddBits);
                      markOptimisticShoppingActionSubmitted();
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

            <AddOddBitForm action={action} />
          </div>
        </CardListItem>

        {optimisticRecipes.map((recipe) => {
          const expanded = expandedIds.has(recipe.id);
          const { toBuy, gotIt } = splitIndexedByPurchased(recipe.ingredients);
          const panelId = `shopping-recipe-${recipe.id}`;

          return (
            <RecipeRow
              action={action}
              expanded={expanded}
              gotIt={gotIt}
              key={recipe.id}
              onToggleExpanded={() => toggleExpanded(recipe.id)}
              panelId={panelId}
              pantryId={pantryId}
              recipe={recipe}
              toBuy={toBuy}
            />
          );
        })}
      </CardList>
    </div>
  );
}

function RecipeRow({
  action,
  recipe,
  expanded,
  panelId,
  pantryId,
  toBuy,
  gotIt,
  onToggleExpanded,
}: {
  action: string;
  recipe: ShoppingRecipeRecord;
  expanded: boolean;
  panelId: string;
  pantryId: string;
  toBuy: { item: ShoppingIngredient; index: number }[];
  gotIt: { item: ShoppingIngredient; index: number }[];
  onToggleExpanded: () => void;
}) {
  const clearFetcher = useFetcher({ key: `shopping-clear-recipe:${recipe.id}` });
  const cookPath = recipe.sourceRecipeId
    ? pantryPath(pantryId, `recipes/${recipe.sourceRecipeId}`)
    : null;

  return (
    <CardListItem className={cn(expanded && "bg-muted/40")}>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          aria-controls={panelId}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold uppercase tracking-[0.06em]">
              {recipe.name}
            </span>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-0">
          {cookPath ? (
            <Button asChild className="size-8" size="icon" variant="ghost">
              <Link aria-label={`Cook ${recipe.name}`} to={cookPath}>
                <UtensilsCrossed className="size-4" />
              </Link>
            </Button>
          ) : null}
          <RemoveRecipeButton action={action} recipeId={recipe.id} recipeName={recipe.name} />
        </div>
      </div>
      {expanded ? (
        <div className="space-y-2 px-4 pb-3" id={panelId}>
          {recipe.link ? (
            <a
              className="inline-flex items-center gap-1 truncate text-sm text-muted-foreground hover:underline"
              href={recipe.link}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-3.5 shrink-0" />
              Source
            </a>
          ) : null}
          {recipe.ingredients.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">No ingredients</p>
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
                <p className="px-1 text-sm text-muted-foreground">All done.</p>
              )}

              {gotIt.length > 0 ? (
                <ShoppingGotItSection
                  count={gotIt.length}
                  onResetAll={() => {
                    resetRecipePurchasedOverrides(recipe);
                    markOptimisticShoppingActionSubmitted();
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
        </div>
      ) : null}
    </CardListItem>
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
        className="size-8"
        size="icon"
        type="submit"
        variant="ghost"
      >
        <Trash2 className="size-4" />
      </Button>
    </fetcher.Form>
  );
}
