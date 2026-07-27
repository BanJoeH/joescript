import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Form } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import type { RecipeIngredient, RecipeStep } from "~/lib/recipe-schema";

type IngredientRow = RecipeIngredient & { key: string };
type StepRow = RecipeStep & { key: string };

export type RecipeFormDefaultValues = {
  name: string;
  link: string;
  servings: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export const emptyRecipeFormDefaultValues: RecipeFormDefaultValues = {
  name: "",
  link: "",
  servings: "",
  ingredients: [],
  steps: [],
};

let keySeed = 0;
function nextKey() {
  keySeed += 1;
  return `row-${keySeed}`;
}

function toIngredientRows(ingredients: RecipeIngredient[]): IngredientRow[] {
  return ingredients.map((ingredient) => ({ ...ingredient, key: nextKey() }));
}

function toStepRows(steps: RecipeStep[]): StepRow[] {
  return steps.map((step) => ({ ...step, key: nextKey() }));
}

export function RecipeForm({
  defaultValues,
  submitLabel,
  error,
}: {
  defaultValues: RecipeFormDefaultValues;
  submitLabel: string;
  error?: string;
}) {
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() =>
    toIngredientRows(defaultValues.ingredients),
  );
  const [steps, setSteps] = useState<StepRow[]>(() => toStepRows(defaultValues.steps));
  const formId = useId();

  function updateIngredient(key: string, patch: Partial<RecipeIngredient>) {
    setIngredients((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addIngredient() {
    setIngredients((rows) => [
      ...rows,
      { key: nextKey(), name: "", amount: null, unit: null, notes: "" },
    ]);
  }

  function removeIngredient(key: string) {
    setIngredients((rows) => rows.filter((row) => row.key !== key));
  }

  function updateStep(key: string, text: string) {
    setSteps((rows) => rows.map((row) => (row.key === key ? { ...row, text } : row)));
  }

  function addStep() {
    setSteps((rows) => [...rows, { key: nextKey(), order: rows.length, text: "" }]);
  }

  function removeStep(key: string) {
    setSteps((rows) => rows.filter((row) => row.key !== key));
  }

  function moveStep(key: string, direction: -1 | 1) {
    setSteps((rows) => {
      const index = rows.findIndex((row) => row.key === key);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const cleanIngredients: RecipeIngredient[] = ingredients
    .filter((row) => row.name.trim().length > 0)
    .map(({ key: _key, ...rest }) => rest);

  const cleanSteps: RecipeStep[] = steps
    .filter((row) => row.text.trim().length > 0)
    .map((row, order) => ({ order, text: row.text }));

  return (
    <Form className="flex flex-col gap-6" method="post">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-name`}>Name</Label>
            <Input
              defaultValue={defaultValues.name}
              id={`${formId}-name`}
              name="name"
              placeholder="Chicken curry"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-link`}>Link (optional)</Label>
              <Input
                defaultValue={defaultValues.link}
                id={`${formId}-link`}
                name="link"
                placeholder="https://..."
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-servings`}>Servings (optional)</Label>
              <Input
                defaultValue={defaultValues.servings}
                id={`${formId}-servings`}
                inputMode="numeric"
                min={1}
                name="servings"
                type="number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingredients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ingredients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ingredients yet.</p>
          ) : (
            <div className="space-y-2">
              {ingredients.map((row) => (
                <div
                  className="grid grid-cols-[4.5rem_4.5rem_1fr_auto] gap-2 sm:grid-cols-[5rem_5rem_1fr_1fr_auto]"
                  key={row.key}
                >
                  <Input
                    aria-label="Amount"
                    inputMode="decimal"
                    onChange={(event) =>
                      updateIngredient(row.key, {
                        amount: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                    placeholder="Amt"
                    value={row.amount ?? ""}
                  />
                  <Input
                    aria-label="Unit"
                    onChange={(event) =>
                      updateIngredient(row.key, { unit: event.target.value || null })
                    }
                    placeholder="Unit"
                    value={row.unit ?? ""}
                  />
                  <Input
                    aria-label="Ingredient name"
                    onChange={(event) => updateIngredient(row.key, { name: event.target.value })}
                    placeholder="Ingredient"
                    value={row.name}
                  />
                  <Input
                    aria-label="Notes"
                    className="hidden sm:block"
                    onChange={(event) => updateIngredient(row.key, { notes: event.target.value })}
                    placeholder="Notes (optional)"
                    value={row.notes ?? ""}
                  />
                  <Button
                    aria-label="Remove ingredient"
                    onClick={() => removeIngredient(row.key)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button onClick={addIngredient} size="sm" type="button" variant="outline">
            <Plus className="size-4" /> Add ingredient
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No steps yet.</p>
          ) : (
            <div className="space-y-2">
              {steps.map((row, index) => (
                <div className="flex items-start gap-2" key={row.key}>
                  <div className="mt-2 flex flex-col text-muted-foreground">
                    <button
                      aria-label="Move step up"
                      className="disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => moveStep(row.key, -1)}
                      type="button"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      aria-label="Move step down"
                      className="disabled:opacity-30"
                      disabled={index === steps.length - 1}
                      onClick={() => moveStep(row.key, 1)}
                      type="button"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>
                  <span className="mt-2 w-5 shrink-0 text-sm font-medium text-muted-foreground">
                    {index + 1}.
                  </span>
                  <Textarea
                    aria-label={`Step ${index + 1}`}
                    onChange={(event) => updateStep(row.key, event.target.value)}
                    placeholder="Describe this step"
                    rows={2}
                    value={row.text}
                  />
                  <Button
                    aria-label="Remove step"
                    onClick={() => removeStep(row.key)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button onClick={addStep} size="sm" type="button" variant="outline">
            <Plus className="size-4" /> Add step
          </Button>
        </CardContent>
      </Card>

      <input name="ingredientsJson" type="hidden" value={JSON.stringify(cleanIngredients)} />
      <input name="stepsJson" type="hidden" value={JSON.stringify(cleanSteps)} />

      <Button className="self-start" type="submit">
        {submitLabel}
      </Button>
    </Form>
  );
}
