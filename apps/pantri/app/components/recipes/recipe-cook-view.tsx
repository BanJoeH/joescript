import { ChevronLeft, ChevronRight, List, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  type AnimationEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useFetcher } from "react-router";
import type { Swiper as SwiperClass } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import { QuantityInput } from "~/components/recipes/quantity-input";
import { useFetcherSuccessToast, useToast } from "~/components/toast";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { RecipeIngredient, RecipeStep } from "~/lib/recipe-schema";
import { formatIngredientLabel } from "~/lib/units";
import { cn } from "~/lib/utils";
import type { RecipeRecord } from "~/services/recipes.service";

type IngredientRow = RecipeIngredient & { key: string };
type StepRow = RecipeStep & { key: string };
type SheetMotion = "enter" | "exit" | "idle";

type CookViewActionData = {
  error?: string;
  saved?: true;
};

/** -1 = ingredients screen; 0..n-1 = method steps. */
const INGREDIENTS_SCREEN = -1;

function toIngredientRows(ingredients: RecipeIngredient[]): IngredientRow[] {
  return ingredients.map((ingredient) => ({ ...ingredient, key: crypto.randomUUID() }));
}

function toStepRows(steps: RecipeStep[]): StepRow[] {
  return steps.map((step) => ({ ...step, key: crypto.randomUUID() }));
}

function IngredientsPeekSheet({
  open,
  onOpenChange,
  ingredients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: RecipeIngredient[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [motion, setMotion] = useState<SheetMotion>("idle");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      setMotion("enter");
      if (!dialog.open) dialog.showModal();
      return;
    }

    setMotion((current) => (dialog.open && current !== "exit" ? "exit" : current));
  }, [open]);

  function requestClose() {
    if (motion !== "exit") onOpenChange(false);
  }

  function handlePanelAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || motion !== "exit") return;
    dialogRef.current?.close();
    setMotion("idle");
  }

  return (
    <dialog
      aria-label="Ingredients"
      className={cn(
        "fixed inset-x-0 top-auto bottom-0 m-0 mt-auto w-full max-w-lg overflow-visible bg-transparent p-0",
        "sm:inset-0 sm:m-auto sm:h-fit",
      )}
      data-motion={motion}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => onOpenChange(false)}
      ref={dialogRef}
    >
      <div
        className={cn(
          "max-h-[75dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] text-card-foreground shadow-lg sm:rounded-2xl sm:border",
          motion === "enter" && "animate-in fade-in slide-in-from-bottom duration-300",
          motion === "exit" && "animate-out fade-out slide-out-to-bottom duration-200",
        )}
        onAnimationEnd={handlePanelAnimationEnd}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.06em]">Ingredients</h2>
          <Button
            aria-label="Close ingredients"
            className="size-8"
            onClick={requestClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-4">
          <CookIngredientsList ingredients={ingredients} />
        </div>

        <Button className="mt-6 w-full" onClick={requestClose} type="button" variant="outline">
          Done
        </Button>
      </div>
    </dialog>
  );
}

function IngredientEditor({
  ingredients,
  onChange,
  onAdd,
  onRemove,
}: {
  ingredients: IngredientRow[];
  onChange: (key: string, patch: Partial<RecipeIngredient>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {ingredients.map((row) => (
        <div
          className="grid grid-cols-[6.5rem_1fr_auto] gap-2 overflow-visible sm:grid-cols-[7rem_1fr_1fr_auto]"
          key={row.key}
        >
          <QuantityInput
            amount={row.amount}
            onChange={({ amount, unit }) => onChange(row.key, { amount, unit })}
            placeholder="Qty"
            unit={row.unit}
          />
          <Input
            aria-label="Ingredient name"
            onChange={(event) => onChange(row.key, { name: event.target.value })}
            placeholder="Ingredient"
            value={row.name}
          />
          <Input
            aria-label="Notes"
            className="hidden sm:block"
            onChange={(event) => onChange(row.key, { notes: event.target.value })}
            placeholder="Notes"
            value={row.notes ?? ""}
          />
          <Button
            aria-label="Remove ingredient"
            onClick={() => onRemove(row.key)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button onClick={onAdd} size="sm" type="button" variant="outline">
        <Plus className="size-4" /> Add ingredient
      </Button>
    </div>
  );
}

function clampCookIndex(index: number, stepCount: number) {
  return Math.min(index, Math.max(INGREDIENTS_SCREEN, stepCount - 1));
}

function cookIndexToSlide(index: number) {
  return index + 1;
}

function slideToCookIndex(slideIndex: number) {
  return slideIndex - 1;
}

function useClientReady() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function CookIngredientsList({ ingredients }: { ingredients: RecipeIngredient[] }) {
  if (ingredients.length === 0) {
    return <p className="text-sm text-muted-foreground">No ingredients.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {ingredients.map((ingredient) => (
        <li
          className="text-base capitalize leading-relaxed"
          key={[
            ingredient.name,
            ingredient.amount ?? "",
            ingredient.unit ?? "",
            ingredient.notes ?? "",
          ].join("|")}
        >
          {formatIngredientLabel(ingredient)}
        </li>
      ))}
    </ul>
  );
}

function CookStepText({ step }: { step: RecipeStep | undefined }) {
  if (!step) {
    return <p className="text-sm text-muted-foreground">No steps.</p>;
  }

  return <p className="text-lg leading-relaxed whitespace-pre-wrap">{step.text}</p>;
}

function CookScreen({
  cookIndex,
  ingredients,
  steps,
}: {
  cookIndex: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}) {
  if (cookIndex === INGREDIENTS_SCREEN) {
    return <CookIngredientsList ingredients={ingredients} />;
  }

  return <CookStepText step={steps[cookIndex]} />;
}

export function RecipeCookView({ recipe }: { recipe: RecipeRecord }) {
  const { toast } = useToast();
  const saveFetcher = useFetcher<CookViewActionData>({ key: `recipe-cook-save:${recipe.id}` });
  const recipeIdRef = useRef(recipe.id);
  const swiperRef = useRef<SwiperClass | null>(null);
  const clientReady = useClientReady();

  const [editing, setEditing] = useState(false);
  const [cookIndex, setCookIndex] = useState(INGREDIENTS_SCREEN);
  const [ingredientsPeekOpen, setIngredientsPeekOpen] = useState(false);
  const [name, setName] = useState(recipe.name);
  const [servings, setServings] = useState(recipe.servings ? String(recipe.servings) : "");
  const [link, setLink] = useState(recipe.link ?? "");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() =>
    toIngredientRows(recipe.ingredients),
  );
  const [steps, setSteps] = useState<StepRow[]>(() => toStepRows(recipe.steps));

  useEffect(() => {
    if (editing) return;

    const recipeChanged = recipeIdRef.current !== recipe.id;
    recipeIdRef.current = recipe.id;

    setName(recipe.name);
    setServings(recipe.servings ? String(recipe.servings) : "");
    setLink(recipe.link ?? "");
    setIngredients(toIngredientRows(recipe.ingredients));
    setSteps(toStepRows(recipe.steps));
    setIngredientsPeekOpen(false);
    setCookIndex((index) =>
      recipeChanged ? INGREDIENTS_SCREEN : clampCookIndex(index, recipe.steps.length),
    );
  }, [recipe, editing]);

  useFetcherSuccessToast(saveFetcher, (data) => {
    if (data.saved) {
      toast({ title: recipe.name, message: "Saved" });
      setEditing(false);
    }
  });

  useLayoutEffect(() => {
    const swiper = swiperRef.current;
    const slide = cookIndexToSlide(cookIndex);
    if (swiper && swiper.activeIndex !== slide) {
      swiper.slideTo(slide);
    }
  }, [cookIndex]);

  const saving = saveFetcher.state !== "idle";
  const error = saveFetcher.data?.error;

  const cleanIngredients: RecipeIngredient[] = ingredients
    .filter((row) => row.name.trim().length > 0)
    .map(({ key: _key, notes, ...rest }) => {
      const trimmedNotes = notes?.trim();
      return trimmedNotes ? { ...rest, notes: trimmedNotes } : rest;
    });

  const cleanSteps: RecipeStep[] = steps
    .filter((row) => row.text.trim().length > 0)
    .map((row, order) => ({ order, text: row.text }));

  const lastCookIndex = Math.max(INGREDIENTS_SCREEN, recipe.steps.length - 1);
  const canGoBack = cookIndex > INGREDIENTS_SCREEN;
  const canGoNext = cookIndex < lastCookIndex;
  const isIngredientsScreen = cookIndex === INGREDIENTS_SCREEN;
  const editingStep = !isIngredientsScreen ? steps[cookIndex] : null;
  const totalScreens = 1 + recipe.steps.length;
  const screenNumber = cookIndex + 2; // ingredients = 1
  const activeSlide = cookIndexToSlide(cookIndex);

  function syncDraftFromRecipe() {
    setName(recipe.name);
    setServings(recipe.servings ? String(recipe.servings) : "");
    setLink(recipe.link ?? "");
    setIngredients(toIngredientRows(recipe.ingredients));
    setSteps(toStepRows(recipe.steps));
  }

  function updateIngredient(key: string, patch: Partial<RecipeIngredient>) {
    setIngredients((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addIngredient() {
    setIngredients((rows) => [
      ...rows,
      { key: crypto.randomUUID(), name: "", amount: null, unit: null, notes: "" },
    ]);
  }

  function removeIngredient(key: string) {
    setIngredients((rows) => rows.filter((row) => row.key !== key));
  }

  function updateCurrentStep(text: string) {
    setSteps((rows) => {
      if (cookIndex < 0) return rows;
      if (cookIndex < rows.length) {
        return rows.map((row, index) => (index === cookIndex ? { ...row, text } : row));
      }
      const next = [...rows];
      while (next.length < cookIndex) {
        next.push({ key: crypto.randomUUID(), order: next.length, text: "" });
      }
      next.push({ key: crypto.randomUUID(), order: cookIndex, text });
      return next;
    });
  }

  function startEditing() {
    setIngredientsPeekOpen(false);
    syncDraftFromRecipe();
    setEditing(true);
  }

  function cancelEditing() {
    syncDraftFromRecipe();
    setEditing(false);
  }

  function goBack() {
    setIngredientsPeekOpen(false);
    setCookIndex((index) => Math.max(INGREDIENTS_SCREEN, index - 1));
  }

  function goNext() {
    setIngredientsPeekOpen(false);
    setCookIndex((index) => Math.min(lastCookIndex, index + 1));
  }

  function goToScreen(index: number) {
    setIngredientsPeekOpen(false);
    setCookIndex(clampCookIndex(index, recipe.steps.length));
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader className="gap-3 space-y-0 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm uppercase tracking-[0.06em]">
                {isIngredientsScreen ? "Ingredients" : `Step ${cookIndex + 1}`}
                {editing ? " · Edit" : null}
              </CardTitle>
              {totalScreens > 1 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {screenNumber} of {totalScreens}
                </p>
              ) : null}
            </div>
            {editing ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  disabled={saving}
                  onClick={cancelEditing}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <saveFetcher.Form method="post">
                  <input name="intent" type="hidden" value="update" />
                  <input name="name" type="hidden" value={name} />
                  <input name="link" type="hidden" value={link} />
                  <input name="servings" type="hidden" value={servings} />
                  <input
                    name="ingredientsJson"
                    type="hidden"
                    value={JSON.stringify(cleanIngredients)}
                  />
                  <input name="stepsJson" type="hidden" value={JSON.stringify(cleanSteps)} />
                  <Button disabled={saving || !name.trim()} size="sm" type="submit">
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </saveFetcher.Form>
              </div>
            ) : (
              <Button
                aria-label={isIngredientsScreen ? "Edit ingredients" : `Edit step ${cookIndex + 1}`}
                className="size-8 shrink-0"
                onClick={startEditing}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Pencil className="size-4" />
              </Button>
            )}
          </div>

          {!editing && (!isIngredientsScreen || totalScreens > 1) ? (
            <div className="flex items-center gap-3">
              {!isIngredientsScreen ? (
                <Button
                  className="shrink-0"
                  onClick={() => setIngredientsPeekOpen(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <List className="size-4" />
                  Ingredients
                </Button>
              ) : null}
              {totalScreens > 1 ? (
                <div
                  aria-hidden
                  className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5"
                >
                  {Array.from({ length: totalScreens }, (_, index) => {
                    const active = index === cookIndex + 1;
                    const label = index === 0 ? "ingredients" : `step-${index}`;
                    return (
                      <button
                        aria-label={index === 0 ? "Go to ingredients" : `Go to step ${index}`}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          active
                            ? "w-6 bg-foreground"
                            : "w-1.5 bg-border hover:bg-muted-foreground",
                        )}
                        key={label}
                        onClick={() => goToScreen(index - 1)}
                        type="button"
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="flex min-h-56 flex-col gap-6 p-4 pt-0">
          {editing ? (
            <div className="space-y-6">
              <div className="space-y-2 border-b border-border pb-4">
                <Input
                  aria-label="Recipe name"
                  className="text-base font-semibold uppercase tracking-[0.06em]"
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
                <div className="flex flex-wrap gap-2">
                  <Input
                    aria-label="Servings"
                    className="w-28"
                    inputMode="numeric"
                    min={1}
                    onChange={(event) => setServings(event.target.value)}
                    placeholder="Servings"
                    type="number"
                    value={servings}
                  />
                  <Input
                    aria-label="Source link"
                    className="min-w-48 flex-1"
                    onChange={(event) => setLink(event.target.value)}
                    placeholder="https://..."
                    type="url"
                    value={link}
                  />
                </div>
              </div>

              {isIngredientsScreen ? (
                <IngredientEditor
                  ingredients={ingredients}
                  onAdd={addIngredient}
                  onChange={updateIngredient}
                  onRemove={removeIngredient}
                />
              ) : (
                <>
                  <Textarea
                    aria-label={`Step ${cookIndex + 1}`}
                    className="min-h-32 text-base leading-relaxed"
                    onChange={(event) => updateCurrentStep(event.target.value)}
                    placeholder="Step"
                    rows={5}
                    value={editingStep?.text ?? ""}
                  />
                  <div className="space-y-2 border-t border-border pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.06em]">
                      Ingredients
                    </h3>
                    <IngredientEditor
                      ingredients={ingredients}
                      onAdd={addIngredient}
                      onChange={updateIngredient}
                      onRemove={removeIngredient}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                {!clientReady || totalScreens === 1 ? (
                  <CookScreen
                    cookIndex={cookIndex}
                    ingredients={recipe.ingredients}
                    steps={recipe.steps}
                  />
                ) : (
                  <Swiper
                    allowTouchMove={totalScreens > 1}
                    autoHeight
                    className="cook-swiper"
                    initialSlide={activeSlide}
                    onSlideChange={(swiper) => {
                      setIngredientsPeekOpen(false);
                      setCookIndex(slideToCookIndex(swiper.activeIndex));
                    }}
                    onSwiper={(swiper) => {
                      swiperRef.current = swiper;
                      if (swiper.activeIndex !== activeSlide) {
                        swiper.slideTo(activeSlide, 0);
                      }
                    }}
                    slidesPerView={1}
                    touchEventsTarget="container"
                    touchStartPreventDefault={false}
                  >
                    <SwiperSlide>
                      <CookIngredientsList ingredients={recipe.ingredients} />
                    </SwiperSlide>
                    {recipe.steps.map((step) => (
                      <SwiperSlide key={`step-${step.order}`}>
                        <CookStepText step={step} />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                )}
              </div>

              {totalScreens > 1 ? (
                <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                  <Button
                    disabled={!canGoBack}
                    onClick={goBack}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ChevronLeft className="size-4" />
                    Back
                  </Button>
                  {canGoNext ? (
                    <Button onClick={goNext} size="sm" type="button">
                      {isIngredientsScreen ? "Start" : "Next"}
                      <ChevronRight className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => goToScreen(INGREDIENTS_SCREEN)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Ingredients
                    </Button>
                  )}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <IngredientsPeekSheet
        ingredients={recipe.ingredients}
        onOpenChange={setIngredientsPeekOpen}
        open={ingredientsPeekOpen}
      />
    </div>
  );
}
