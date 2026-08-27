import {
  ALargeSmall,
  ChevronLeft,
  ChevronRight,
  List,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import {
  type AnimationEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useFetcher } from "react-router";
import type { Swiper as SwiperClass } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";

import { IngredientEditorRow } from "~/components/recipes/ingredient-editor-row";
import { useFetcherSuccessToast, useToast } from "~/components/toast";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useCookFocus } from "~/lib/cook-focus";
import {
  COOK_INGREDIENT_TEXT_CLASS,
  COOK_STEP_TEXT_CLASS,
  type CookTextSize,
  useCookTextSize,
} from "~/lib/cook-preferences";
import { linkStepIngredients } from "~/lib/link-step-ingredients";
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
  textSize,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: RecipeIngredient[];
  textSize: CookTextSize;
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
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
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
          <CookIngredientsList ingredients={ingredients} textSize={textSize} />
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
  focusQuantityKey,
}: {
  ingredients: IngredientRow[];
  onChange: (key: string, patch: Partial<RecipeIngredient>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  focusQuantityKey?: string | null;
}) {
  return (
    <div className="space-y-2">
      {ingredients.map((row) => (
        <IngredientEditorRow
          amount={row.amount}
          autoFocusQuantity={row.key === focusQuantityKey}
          key={row.key}
          name={row.name}
          notes={row.notes ?? ""}
          onNameChange={(name) => onChange(row.key, { name })}
          onNotesChange={(notes) => onChange(row.key, { notes })}
          onQuantityChange={({ amount, unit }) => onChange(row.key, { amount, unit })}
          onRemove={() => onRemove(row.key)}
          unit={row.unit}
        />
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

function CookIngredientsList({
  ingredients,
  textSize,
}: {
  ingredients: RecipeIngredient[];
  textSize: CookTextSize;
}) {
  if (ingredients.length === 0) {
    return <p className="text-sm text-muted-foreground">No ingredients.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {ingredients.map((ingredient) => (
        <li
          className={cn("capitalize leading-relaxed", COOK_INGREDIENT_TEXT_CLASS[textSize])}
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

function IngredientQuantityTooltip({
  anchor,
  label,
  onClose,
}: {
  anchor: HTMLElement;
  label: string;
  onClose: () => void;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    function updatePosition() {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const rect = anchor.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      const gap = 8;
      const padding = 12;

      let top = rect.top - tipRect.height - gap;
      if (top < padding) {
        top = rect.bottom + gap;
      }

      let left = rect.left + rect.width / 2 - tipRect.width / 2;
      left = Math.min(Math.max(left, padding), window.innerWidth - tipRect.width - padding);

      setPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchor]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (anchor.contains(target) || tooltipRef.current?.contains(target)) return;
      onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [anchor, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-auto fixed z-50 max-w-[min(18rem,calc(100vw-1.5rem))] rounded-md border border-border bg-card px-3 py-2 text-sm capitalize leading-snug text-card-foreground shadow-lg"
      id="ingredient-quantity-tooltip"
      ref={tooltipRef}
      role="tooltip"
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        visibility: position ? "visible" : "hidden",
      }}
    >
      {label}
    </div>,
    document.body,
  );
}

function CookStepText({
  step,
  ingredients,
  textSize,
}: {
  step: RecipeStep | undefined;
  ingredients: RecipeIngredient[];
  textSize: CookTextSize;
}) {
  const [active, setActive] = useState<{
    ingredientIndex: number;
    key: string;
    anchor: HTMLElement;
  } | null>(null);
  const stepText = step?.text;

  useEffect(() => {
    void stepText;
    setActive(null);
  }, [stepText]);

  if (!step) {
    return <p className="text-sm text-muted-foreground">No steps.</p>;
  }

  const segments = linkStepIngredients(step.text, ingredients);
  const activeIngredient = active ? ingredients[active.ingredientIndex] : null;
  let segmentOffset = 0;

  return (
    <div>
      <div className={cn("leading-relaxed whitespace-pre-wrap", COOK_STEP_TEXT_CLASS[textSize])}>
        {segments.map((segment) => {
          const key = `${segment.type}-${segmentOffset}-${segment.text.length}`;
          segmentOffset += segment.text.length;

          if (segment.type === "text") {
            return <span key={key}>{segment.text}</span>;
          }

          const isActive = active?.key === key;
          return (
            <button
              aria-describedby={isActive ? "ingredient-quantity-tooltip" : undefined}
              aria-expanded={isActive}
              aria-label={`Show quantity for ${segment.text}`}
              className={cn(
                "rounded-sm font-medium underline decoration-dotted decoration-from-font underline-offset-2",
                "text-foreground hover:bg-accent/60",
                isActive && "bg-accent",
              )}
              key={key}
              onClick={(event) => {
                const anchor = event.currentTarget;
                setActive((current) =>
                  current?.key === key
                    ? null
                    : { ingredientIndex: segment.ingredientIndex, key, anchor },
                );
              }}
              type="button"
            >
              {segment.text}
            </button>
          );
        })}
      </div>

      {active && activeIngredient ? (
        <IngredientQuantityTooltip
          anchor={active.anchor}
          label={formatIngredientLabel(activeIngredient)}
          onClose={() => setActive(null)}
        />
      ) : null}
    </div>
  );
}

function CookScreen({
  cookIndex,
  ingredients,
  steps,
  textSize,
}: {
  cookIndex: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  textSize: CookTextSize;
}) {
  if (cookIndex === INGREDIENTS_SCREEN) {
    return <CookIngredientsList ingredients={ingredients} textSize={textSize} />;
  }

  return <CookStepText ingredients={ingredients} step={steps[cookIndex]} textSize={textSize} />;
}

export function RecipeCookView({
  recipe,
  className,
}: {
  recipe: RecipeRecord;
  className?: string;
}) {
  const { toast } = useToast();
  const cookFocus = useCookFocus();
  const focused = cookFocus?.focused ?? false;
  const { textSize, cycleTextSize } = useCookTextSize();
  const saveFetcher = useFetcher<CookViewActionData>({ key: `recipe-cook-save:${recipe.id}` });
  const recipeIdRef = useRef(recipe.id);
  const swiperRef = useRef<SwiperClass | null>(null);
  const clientReady = useClientReady();

  const [editing, setEditing] = useState(false);
  const [cookIndex, setCookIndex] = useState(INGREDIENTS_SCREEN);
  const [ingredientsPeekOpen, setIngredientsPeekOpen] = useState(false);
  const [focusIngredientKey, setFocusIngredientKey] = useState<string | null>(null);
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

  useLayoutEffect(() => {
    // Recalculate slide height after text size or focus chrome changes.
    void textSize;
    void focused;
    const swiper = swiperRef.current;
    if (!swiper) return;
    swiper.update();
    swiper.updateAutoHeight(0);
  }, [textSize, focused]);

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
    const key = crypto.randomUUID();
    setIngredients((rows) => [...rows, { key, name: "", amount: null, unit: null, notes: "" }]);
    setFocusIngredientKey(key);
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
    cookFocus?.setFocused(false);
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
    <div className={cn("flex flex-col gap-4", focused && "h-full min-h-0 gap-0", className)}>
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card className={cn(focused && "flex h-full min-h-0 flex-col border-0 shadow-none")}>
        <CardHeader className="gap-3 space-y-0 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm uppercase tracking-[0.06em]">
                {focused && !editing ? (
                  <span className="block truncate text-muted-foreground normal-case tracking-normal">
                    {recipe.name}
                  </span>
                ) : null}
                <span className={cn(focused && !editing && "mt-1 block")}>
                  {isIngredientsScreen ? "Ingredients" : `Step ${cookIndex + 1}`}
                  {editing ? " · Edit" : null}
                </span>
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
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  aria-label={`Text size ${textSize + 1} of 3. Cycle text size`}
                  className="size-8"
                  onClick={cycleTextSize}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ALargeSmall className="size-4" />
                </Button>
                {cookFocus ? (
                  <Button
                    aria-label={focused ? "Exit focus mode" : "Enter focus mode"}
                    className="size-8"
                    onClick={() => cookFocus.toggleFocused()}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    {focused ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                  </Button>
                ) : null}
                <Button
                  aria-label={
                    isIngredientsScreen ? "Edit ingredients" : `Edit step ${cookIndex + 1}`
                  }
                  className="size-8"
                  onClick={startEditing}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
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

        <CardContent
          className={cn("flex min-h-56 flex-col gap-6 p-4 pt-0", focused && "min-h-0 flex-1")}
        >
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
                  focusQuantityKey={focusIngredientKey}
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
                      focusQuantityKey={focusIngredientKey}
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
              <div className={cn("min-w-0 flex-1", focused && "min-h-0 overflow-y-auto")}>
                {!clientReady || totalScreens === 1 ? (
                  <CookScreen
                    cookIndex={cookIndex}
                    ingredients={recipe.ingredients}
                    steps={recipe.steps}
                    textSize={textSize}
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
                      <CookIngredientsList ingredients={recipe.ingredients} textSize={textSize} />
                    </SwiperSlide>
                    {recipe.steps.map((step) => (
                      <SwiperSlide key={`step-${step.order}`}>
                        <CookStepText
                          ingredients={recipe.ingredients}
                          step={step}
                          textSize={textSize}
                        />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                )}
              </div>

              {totalScreens > 1 ? (
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border pt-4">
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
        textSize={textSize}
      />
    </div>
  );
}
