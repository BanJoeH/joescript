import {
  ArrowRightLeft,
  ChevronDown,
  ExternalLink,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { QuantityInput } from "~/components/recipes/quantity-input";
import { ShoppingGotItSection } from "~/components/shopping/shopping-got-it-section";
import { Button } from "~/components/ui/button";
import { CardList, CardListItem } from "~/components/ui/card-list";
import { Input } from "~/components/ui/input";
import { cancelPendingOddBitAdd, queuedOddBitAddIds } from "~/lib/offline/outbox";
import { submitShoppingMutation } from "~/lib/offline/submit-shopping-mutation";
import { useShoppingLocalState } from "~/lib/offline/use-shopping-local";
import { pantryPath } from "~/lib/pantry-path";
import type { OddBit, ShoppingIngredient } from "~/lib/recipe-schema";
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
  pantryId,
  recipeId,
  ingredient,
}: {
  action: string;
  pantryId: string;
  recipeId: string;
  ingredient: ShoppingIngredient;
}) {
  return (
    <IngredientCheckbox
      checked={ingredient.purchased}
      label={formatIngredientLabel(ingredient)}
      onToggle={(next) => {
        void submitShoppingMutation({
          pantryId,
          action,
          fields: {
            intent: "toggle-ingredient",
            shoppingRecipeId: recipeId,
            ingredientId: ingredient.id,
            purchased: String(next),
          },
        });
      }}
    />
  );
}

function AddOddBitForm({ action, pantryId }: { action: string; pantryId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const [addCycle, setAddCycle] = useState(0);
  const [quantity, setQuantity] = useState<{ amount: number | null; unit: string | null }>({
    amount: null,
    unit: null,
  });

  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-2"
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const name = String(new FormData(form).get("name") ?? "").trim();
        if (!name) return;

        const formData = new FormData(form);
        formData.set("id", crypto.randomUUID());
        const fields = Object.fromEntries(formData.entries()) as Record<string, string>;
        void submitShoppingMutation({ pantryId, action, fields });
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
      <Button
        onTouchEnd={(event) => {
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }}
        size="sm"
        type="submit"
      >
        <Plus className="size-4" /> Add
      </Button>
    </form>
  );
}

function OddBitRow({
  action,
  pantryId,
  bit,
  queuedAdd,
  onCancelPending,
}: {
  action: string;
  pantryId: string;
  bit: OddBit;
  /** Still in the outbox as an undrained add — cancel removes it locally. */
  queuedAdd: boolean;
  onCancelPending: (oddBitId: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex-1">
        <IngredientCheckbox
          checked={bit.purchased}
          label={formatIngredientLabel(bit)}
          onToggle={(next) => {
            void submitShoppingMutation({
              pantryId,
              action,
              fields: {
                intent: "toggle-odd-bit",
                id: bit.id,
                purchased: String(next),
              },
            });
          }}
        />
      </div>
      <Button
        aria-label="Remove odd bit"
        onClick={() => {
          if (queuedAdd) {
            onCancelPending(bit.id);
            return;
          }
          void submitShoppingMutation({
            pantryId,
            action,
            fields: { intent: "remove-odd-bit", id: bit.id },
          });
        }}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Trash2 className="size-4" />
      </Button>
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
  const local = useShoppingLocalState(pantryId, { recipes, oddBits });
  const viewRecipes = local.recipes;
  const viewOddBits = local.oddBits;
  const queuedAddIds = useMemo(() => queuedOddBitAddIds(local.outbox), [local.outbox]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const { toBuy: oddBitsToBuy, gotIt: oddBitsGotIt } = splitIndexedByPurchased(viewOddBits);

  function toggleExpanded(recipeId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(recipeId)) next.delete(recipeId);
      else next.add(recipeId);
      return next;
    });
  }

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
            {viewOddBits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {viewRecipes.length === 0
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
                        onCancelPending={(id) => void cancelPendingOddBitAdd(pantryId, id)}
                        pantryId={pantryId}
                        queuedAdd={queuedAddIds.has(bit.id)}
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
                      void submitShoppingMutation({
                        pantryId,
                        action,
                        fields: { intent: "clear-odd-bits-purchased" },
                      });
                    }}
                  >
                    {oddBitsGotIt.map(({ item: bit }) => (
                      <OddBitRow
                        action={action}
                        bit={bit}
                        key={bit.id}
                        onCancelPending={(id) => void cancelPendingOddBitAdd(pantryId, id)}
                        pantryId={pantryId}
                        queuedAdd={queuedAddIds.has(bit.id)}
                      />
                    ))}
                  </ShoppingGotItSection>
                ) : null}
              </>
            )}

            <AddOddBitForm action={action} pantryId={pantryId} />
          </div>
        </CardListItem>

        {viewRecipes.map((recipe) => {
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
              void submitShoppingMutation({
                pantryId,
                action,
                fields: { intent: "remove-recipe", shoppingRecipeId: recipe.id },
              });
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
                    pantryId={pantryId}
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
                    void submitShoppingMutation({
                      pantryId,
                      action,
                      fields: {
                        intent: "clear-recipe-purchased",
                        shoppingRecipeId: recipe.id,
                      },
                    });
                  }}
                >
                  {gotIt.map(({ item }) => (
                    <RecipeIngredientRow
                      action={action}
                      ingredient={item}
                      key={item.id}
                      pantryId={pantryId}
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
