import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { type KeyboardEvent, useId, useState } from "react";
import { Form } from "react-router";

import { IngredientEditorRow } from "~/components/recipes/ingredient-editor-row";
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

function emptyIngredientRow(key = crypto.randomUUID()): IngredientRow {
  return { key, name: "", amount: null, unit: null, notes: "" };
}

function toIngredientRows(ingredients: RecipeIngredient[]): IngredientRow[] {
  if (ingredients.length === 0) return [emptyIngredientRow()];
  return ingredients.map((ingredient) => ({ ...ingredient, key: crypto.randomUUID() }));
}

function toStepRows(steps: RecipeStep[]): StepRow[] {
  return steps.map((step) => ({ ...step, key: crypto.randomUUID() }));
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
  const [focusIngredientKey, setFocusIngredientKey] = useState<string | null>(null);
  const formId = useId();

  function updateIngredient(key: string, patch: Partial<RecipeIngredient>) {
    setIngredients((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addIngredient(afterKey?: string) {
    const key = crypto.randomUUID();
    setIngredients((rows) => {
      const row = emptyIngredientRow(key);
      if (!afterKey) return [...rows, row];
      const index = rows.findIndex((candidate) => candidate.key === afterKey);
      if (index === -1) return [...rows, row];
      const next = [...rows];
      next.splice(index + 1, 0, row);
      return next;
    });
    setFocusIngredientKey(key);
  }

  function removeIngredient(key: string) {
    setIngredients((rows) => {
      const next = rows.filter((row) => row.key !== key);
      return next.length === 0 ? [emptyIngredientRow()] : next;
    });
  }

  function onIngredientKeyDown(event: KeyboardEvent<HTMLInputElement>, key: string) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addIngredient(key);
  }

  function updateStep(key: string, text: string) {
    setSteps((rows) => rows.map((row) => (row.key === key ? { ...row, text } : row)));
  }

  function addStep() {
    setSteps((rows) => [...rows, { key: crypto.randomUUID(), order: rows.length, text: "" }]);
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
    .map(({ key: _key, notes, ...rest }) => {
      const trimmedNotes = notes?.trim();
      return trimmedNotes ? { ...rest, notes: trimmedNotes } : rest;
    });

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
          <div className="space-y-2">
            {ingredients.map((row) => (
              <IngredientEditorRow
                amount={row.amount}
                autoFocusQuantity={row.key === focusIngredientKey}
                key={row.key}
                name={row.name}
                nameId={`${formId}-ingredient-${row.key}-name`}
                notes={row.notes ?? ""}
                onKeyDown={(event) => onIngredientKeyDown(event, row.key)}
                onNameChange={(name) => updateIngredient(row.key, { name })}
                onNotesChange={(notes) => updateIngredient(row.key, { notes })}
                onQuantityChange={({ amount, unit }) => updateIngredient(row.key, { amount, unit })}
                onRemove={() => removeIngredient(row.key)}
                quantityId={`${formId}-ingredient-${row.key}-quantity`}
                unit={row.unit}
              />
            ))}
          </div>
          <Button onClick={() => addIngredient()} size="sm" type="button" variant="outline">
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
            <p className="text-sm text-muted-foreground">No steps.</p>
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
                    placeholder="Step"
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
