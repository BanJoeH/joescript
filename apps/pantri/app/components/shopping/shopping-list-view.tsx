import {
  ArrowRightLeft,
  ChevronDown,
  ExternalLink,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useFetchers } from "react-router";

import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { QuantityInput } from "~/components/recipes/quantity-input";
import { ShoppingGotItSection } from "~/components/shopping/shopping-got-it-section";
import { Button } from "~/components/ui/button";
import { CardList, CardListItem } from "~/components/ui/card-list";
import { Input } from "~/components/ui/input";
import { pantryPath } from "~/lib/pantry-path";
import type { OddBit, ShoppingIngredient } from "~/lib/recipe-schema";
import {
  isPendingOddBitId,
  mergeOddBits,
  mergeShoppingRecipes,
  replacePendingOddBit,
  shoppingBusyFromFetchers,
} from "~/lib/shopping-local-merge";
import { splitIndexedByPurchased } from "~/lib/split-purchased";
import { formatIngredientLabel } from "~/lib/units";
import { useRevalidateOnFetcherError } from "~/lib/use-revalidate-on-fetcher-error";
import { cn } from "~/lib/utils";
import type { ShoppingRecipeRecord } from "~/services/shopping.service";

function shoppingRecipesLookEqual(a: ShoppingRecipeRecord[], b: ShoppingRecipeRecord[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!;
    const right = b[i]!;
    if (left.id !== right.id || left.ingredients.length !== right.ingredients.length) return false;
    for (let j = 0; j < left.ingredients.length; j++) {
      const li = left.ingredients[j]!;
      const ri = right.ingredients[j]!;
      if (li.id !== ri.id || li.purchased !== ri.purchased) return false;
    }
  }
  return true;
}

function oddBitsLookEqual(a: OddBit[], b: OddBit[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!;
    const right = b[i]!;
    if (left.id !== right.id || left.purchased !== right.purchased || left.name !== right.name) {
      return false;
    }
  }
  return true;
}

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
  ingredient,
  onPurchased,
}: {
  action: string;
  recipeId: string;
  ingredient: ShoppingIngredient;
  onPurchased: (ingredientId: string, purchased: boolean) => void;
}) {
  const fetcher = useFetcher({ key: `shopping-toggle-ingredient:${recipeId}:${ingredient.id}` });

  return (
    <IngredientCheckbox
      checked={ingredient.purchased}
      label={formatIngredientLabel(ingredient)}
      onToggle={(next) => {
        onPurchased(ingredient.id, next);
        fetcher.submit(
          {
            intent: "toggle-ingredient",
            shoppingRecipeId: recipeId,
            ingredientId: ingredient.id,
            purchased: String(next),
          },
          { method: "post", action },
        );
      }}
    />
  );
}

type AddOddBitActionData =
  | { ok: true; oddBit: OddBit; clientPendingId: string | null }
  | { error: string };

function AddOddBitForm({
  action,
  onOptimisticAdd,
  onReconcileAdd,
  onAddError,
}: {
  action: string;
  onOptimisticAdd: (bit: OddBit) => void;
  onReconcileAdd: (clientPendingId: string, oddBit: OddBit) => void;
  onAddError: (clientPendingId: string) => void;
}) {
  const [submitKey, setSubmitKey] = useState(() => crypto.randomUUID());
  const [pendingId, setPendingId] = useState(() => `pending:${crypto.randomUUID()}`);
  const fetcher = useFetcher<AddOddBitActionData>({ key: `shopping-add-odd-bit:${submitKey}` });
  const formRef = useRef<HTMLFormElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const onReconcileAddRef = useRef(onReconcileAdd);
  const onAddErrorRef = useRef(onAddError);
  onReconcileAddRef.current = onReconcileAdd;
  onAddErrorRef.current = onAddError;
  const [addCycle, setAddCycle] = useState(0);
  const [quantity, setQuantity] = useState<{ amount: number | null; unit: string | null }>({
    amount: null,
    unit: null,
  });
  const handledDataRef = useRef<AddOddBitActionData | null>(null);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data || fetcher.data === handledDataRef.current) {
      return;
    }
    handledDataRef.current = fetcher.data;

    if ("oddBit" in fetcher.data && fetcher.data.oddBit) {
      const clientPendingId = fetcher.data.clientPendingId ?? pendingId;
      onReconcileAddRef.current(clientPendingId, fetcher.data.oddBit);
      setSubmitKey(crypto.randomUUID());
      setPendingId(`pending:${crypto.randomUUID()}`);
      return;
    }

    if ("error" in fetcher.data) {
      onAddErrorRef.current(pendingId);
      setSubmitKey(crypto.randomUUID());
      setPendingId(`pending:${crypto.randomUUID()}`);
    }
  }, [fetcher.state, fetcher.data, pendingId]);

  return (
    <fetcher.Form
      action={action}
      className="flex flex-wrap items-end gap-2"
      method="post"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const name = String(new FormData(form).get("name") ?? "").trim();
        if (name) {
          onOptimisticAdd({
            id: pendingId,
            name,
            amount: quantity.amount,
            unit: quantity.unit,
            purchased: false,
          });
        }
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
      <input name="clientPendingId" type="hidden" value={pendingId} />
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
      <Button
        onTouchEnd={(event) => {
          // Block the post-keyboard synthetic click so it can't land on a
          // row control that moved under this point (often Remove).
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }}
        size="sm"
        type="submit"
      >
        <Plus className="size-4" /> Add
      </Button>
    </fetcher.Form>
  );
}

function OddBitRow({
  action,
  bit,
  onPurchased,
  onRemove,
}: {
  action: string;
  bit: OddBit;
  onPurchased: (id: string, purchased: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const toggleFetcher = useFetcher({ key: `shopping-toggle-odd-bit:${bit.id}` });
  const removeFetcher = useFetcher({ key: `shopping-remove-odd-bit:${bit.id}` });
  const isPending = isPendingOddBitId(bit.id);

  return (
    <div className="flex items-center gap-1">
      <div className="flex-1">
        <IngredientCheckbox
          checked={bit.purchased}
          label={formatIngredientLabel(bit)}
          onToggle={(next) => {
            if (isPending) return;
            onPurchased(bit.id, next);
            toggleFetcher.submit(
              {
                intent: "toggle-odd-bit",
                id: bit.id,
                purchased: String(next),
              },
              { method: "post", action },
            );
          }}
        />
      </div>
      {isPending ? null : (
        <Button
          aria-label="Remove odd bit"
          onClick={() => {
            onRemove(bit.id);
            removeFetcher.submit(
              { intent: "remove-odd-bit", id: bit.id },
              { method: "post", action },
            );
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}

export type ShoppingListViewProps = {
  recipes: ShoppingRecipeRecord[];
  oddBits: OddBit[];
  pantryId: string;
};

export function ShoppingListView({ recipes, oddBits, pantryId }: ShoppingListViewProps) {
  const action = pantryPath(pantryId, "shopping");
  const fetchers = useFetchers();
  const clearOddBitsFetcher = useFetcher({ key: "shopping-clear-odd-bits" });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [localRecipes, setLocalRecipes] = useState(recipes);
  const [localOddBits, setLocalOddBits] = useState(oddBits);

  useRevalidateOnFetcherError();

  useEffect(() => {
    const busy = shoppingBusyFromFetchers(fetchers);
    setLocalRecipes((current) => {
      const next = mergeShoppingRecipes(recipes, current, busy);
      return shoppingRecipesLookEqual(current, next) ? current : next;
    });
    setLocalOddBits((current) => {
      const next = mergeOddBits(oddBits, current, busy);
      return oddBitsLookEqual(current, next) ? current : next;
    });
  }, [recipes, oddBits, fetchers]);

  function toggleExpanded(recipeId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
  }

  function setIngredientPurchased(recipeId: string, ingredientId: string, purchased: boolean) {
    setLocalRecipes((current) =>
      current.map((recipe) =>
        recipe.id !== recipeId
          ? recipe
          : {
              ...recipe,
              ingredients: recipe.ingredients.map((ingredient) =>
                ingredient.id === ingredientId ? { ...ingredient, purchased } : ingredient,
              ),
            },
      ),
    );
  }

  function clearRecipePurchased(recipeId: string) {
    setLocalRecipes((current) =>
      current.map((recipe) =>
        recipe.id !== recipeId
          ? recipe
          : {
              ...recipe,
              ingredients: recipe.ingredients.map((ingredient) =>
                ingredient.purchased ? { ...ingredient, purchased: false } : ingredient,
              ),
            },
      ),
    );
  }

  function removeRecipe(recipeId: string) {
    setLocalRecipes((current) => current.filter((recipe) => recipe.id !== recipeId));
  }

  function setOddBitPurchased(id: string, purchased: boolean) {
    setLocalOddBits((current) =>
      current.map((bit) => (bit.id === id ? { ...bit, purchased } : bit)),
    );
  }

  function removeOddBit(id: string) {
    setLocalOddBits((current) => current.filter((bit) => bit.id !== id));
  }

  function clearOddBitsPurchased() {
    setLocalOddBits((current) =>
      current.map((bit) => (bit.purchased ? { ...bit, purchased: false } : bit)),
    );
  }

  const { toBuy: oddBitsToBuy, gotIt: oddBitsGotIt } = splitIndexedByPurchased(localOddBits);

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
            {localOddBits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {localRecipes.length === 0
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
                        key={bit.id}
                        onPurchased={setOddBitPurchased}
                        onRemove={removeOddBit}
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
                      clearOddBitsPurchased();
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
                        key={bit.id}
                        onPurchased={setOddBitPurchased}
                        onRemove={removeOddBit}
                      />
                    ))}
                  </ShoppingGotItSection>
                ) : null}
              </>
            )}

            <AddOddBitForm
              action={action}
              onAddError={(clientPendingId) =>
                setLocalOddBits((current) => current.filter((bit) => bit.id !== clientPendingId))
              }
              onOptimisticAdd={(bit) => setLocalOddBits((current) => [...current, bit])}
              onReconcileAdd={(clientPendingId, oddBit) =>
                setLocalOddBits((current) => replacePendingOddBit(current, clientPendingId, oddBit))
              }
            />
          </div>
        </CardListItem>

        {localRecipes.map((recipe) => {
          const expanded = expandedIds.has(recipe.id);
          const { toBuy, gotIt } = splitIndexedByPurchased(recipe.ingredients);
          const panelId = `shopping-recipe-${recipe.id}`;

          return (
            <RecipeRow
              action={action}
              expanded={expanded}
              gotIt={gotIt}
              key={recipe.id}
              onClearPurchased={() => clearRecipePurchased(recipe.id)}
              onIngredientPurchased={(ingredientId, purchased) =>
                setIngredientPurchased(recipe.id, ingredientId, purchased)
              }
              onRemove={() => removeRecipe(recipe.id)}
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
  onIngredientPurchased,
  onClearPurchased,
  onRemove,
}: {
  action: string;
  recipe: ShoppingRecipeRecord;
  expanded: boolean;
  panelId: string;
  pantryId: string;
  toBuy: { item: ShoppingIngredient; index: number }[];
  gotIt: { item: ShoppingIngredient; index: number }[];
  onToggleExpanded: () => void;
  onIngredientPurchased: (ingredientId: string, purchased: boolean) => void;
  onClearPurchased: () => void;
  onRemove: () => void;
}) {
  const clearFetcher = useFetcher({ key: `shopping-clear-recipe:${recipe.id}` });
  const removeFetcher = useFetcher({ key: `shopping-remove-recipe:${recipe.id}` });
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
          <Button
            aria-label={`Remove ${recipe.name} from shopping list`}
            className="size-8"
            onClick={() => {
              onRemove();
              removeFetcher.submit(
                { intent: "remove-recipe", shoppingRecipeId: recipe.id },
                { method: "post", action },
              );
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
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
                toBuy.map(({ item }) => (
                  <RecipeIngredientRow
                    action={action}
                    ingredient={item}
                    key={item.id}
                    onPurchased={onIngredientPurchased}
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
                    onClearPurchased();
                    clearFetcher.submit(
                      { intent: "clear-recipe-purchased", shoppingRecipeId: recipe.id },
                      { method: "post", action },
                    );
                  }}
                >
                  {gotIt.map(({ item }) => (
                    <RecipeIngredientRow
                      action={action}
                      ingredient={item}
                      key={item.id}
                      onPurchased={onIngredientPurchased}
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
