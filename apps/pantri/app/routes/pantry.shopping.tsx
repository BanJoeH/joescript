import { Plus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Form, useFetcher, useLoaderData } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

import type { Route } from "./+types/pantry.shopping";

export { action, loader } from "./pantry.shopping.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Shopping · Pantri" }];
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
    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50">
      <input
        checked={checked}
        className="size-4 shrink-0 accent-primary"
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

export default function ShoppingPage() {
  const { recipes, oddBits } = useLoaderData<typeof import("./pantry.shopping.server").loader>();
  const toggleFetcher = useFetcher();
  const removeFetcher = useFetcher();
  const oddBitFetcher = useFetcher();
  const addOddBitFormRef = useRef<HTMLFormElement>(null);

  function toggleIngredient(shoppingRecipeId: string, ingredientIndex: number, purchased: boolean) {
    toggleFetcher.submit(
      {
        intent: "toggle-ingredient",
        shoppingRecipeId,
        ingredientIndex: String(ingredientIndex),
        purchased: String(purchased),
      },
      { method: "post" },
    );
  }

  function toggleOddBit(index: number, purchased: boolean) {
    oddBitFetcher.submit(
      { intent: "toggle-odd-bit", index: String(index), purchased: String(purchased) },
      { method: "post" },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Shopping list</h2>
        <p className="text-sm text-muted-foreground">
          Grouped by recipe. Check off what you've got.
        </p>
      </div>

      {recipes.length === 0 && oddBits.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Your shopping list is empty. Add a recipe from the Recipes page, or add an odd bit
            below.
          </CardContent>
        </Card>
      ) : null}

      {recipes.map((recipe) => (
        <Card key={recipe.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{recipe.name}</CardTitle>
            <removeFetcher.Form method="post">
              <input name="intent" type="hidden" value="remove-recipe" />
              <input name="shoppingRecipeId" type="hidden" value={recipe.id} />
              <Button
                aria-label={`Remove ${recipe.name} from shopping list`}
                size="icon"
                type="submit"
                variant="ghost"
              >
                <Trash2 className="size-4" />
              </Button>
            </removeFetcher.Form>
          </CardHeader>
          <CardContent className="space-y-1">
            {recipe.ingredients.map((ingredient, index) => (
              <IngredientCheckbox
                checked={ingredient.purchased}
                // biome-ignore lint/suspicious/noArrayIndexKey: ingredients are addressed by array index server-side, there's no stable id
                key={`${recipe.id}-${index}`}
                label={formatIngredientLabel(ingredient)}
                onToggle={(next) => toggleIngredient(recipe.id, index, next)}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Odd bits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {oddBits.length > 0 ? (
            <div>
              {oddBits.map((bit, index) => (
                <div
                  className="flex items-center gap-1"
                  // biome-ignore lint/suspicious/noArrayIndexKey: odd bits are addressed by array index server-side, there's no stable id
                  key={`odd-bit-${index}`}
                >
                  <div className="flex-1">
                    <IngredientCheckbox
                      checked={bit.purchased}
                      label={formatIngredientLabel(bit)}
                      onToggle={(next) => toggleOddBit(index, next)}
                    />
                  </div>
                  <oddBitFetcher.Form method="post">
                    <input name="intent" type="hidden" value="remove-odd-bit" />
                    <input name="index" type="hidden" value={index} />
                    <Button aria-label="Remove odd bit" size="icon" type="submit" variant="ghost">
                      <Trash2 className="size-4" />
                    </Button>
                  </oddBitFetcher.Form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Things you need that aren't part of a recipe — a few odds and ends.
            </p>
          )}

          <Form
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
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
