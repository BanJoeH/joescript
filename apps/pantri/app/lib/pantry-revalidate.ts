/** Shopping/home intents that already update optimistically on the client. */
const OPTIMISTIC_HOME_INTENTS = new Set([
  "toggle-ingredient",
  "toggle-odd-bit",
  "clear-recipe-purchased",
  "clear-odd-bits-purchased",
]);

/** Revalidate after this many skipped optimistic actions. */
export const OPTIMISTIC_REVALIDATE_AFTER_ACTIONS = 5;

/** Revalidate once this long after the first skipped optimistic action. */
export const OPTIMISTIC_REVALIDATE_AFTER_MS = 10_000;

type RevalidateArgs = {
  formMethod?: string;
  formData?: FormData;
  defaultShouldRevalidate: boolean;
};

let pendingOptimisticActions = 0;
let pendingSince: number | null = null;

export function resetOptimisticRevalidationPending() {
  pendingOptimisticActions = 0;
  pendingSince = null;
}

export function hasPendingOptimisticRevalidation() {
  return pendingOptimisticActions > 0;
}

export function shouldFlushOptimisticRevalidation(now = Date.now()) {
  if (pendingOptimisticActions === 0) {
    return false;
  }

  if (pendingOptimisticActions >= OPTIMISTIC_REVALIDATE_AFTER_ACTIONS) {
    return true;
  }

  return pendingSince !== null && now - pendingSince >= OPTIMISTIC_REVALIDATE_AFTER_MS;
}

function noteOptimisticActionSkipped(now = Date.now()) {
  pendingOptimisticActions += 1;
  pendingSince ??= now;
}

function isOptimisticHomeIntent(formData: FormData) {
  const intent = formData.get("intent");
  return typeof intent === "string" && OPTIMISTIC_HOME_INTENTS.has(intent);
}

/** Call when submitting an optimistic shopping/home fetcher action. */
export function markOptimisticShoppingActionSubmitted() {
  noteOptimisticActionSkipped();
}

export function shouldRevalidatePantryRoutes({
  formMethod,
  formData,
  defaultShouldRevalidate,
}: RevalidateArgs) {
  const optimisticIntent = formMethod === "POST" && formData && isOptimisticHomeIntent(formData);

  if (
    formMethod === "POST" &&
    formData &&
    !isOptimisticHomeIntent(formData) &&
    defaultShouldRevalidate
  ) {
    resetOptimisticRevalidationPending();
    return defaultShouldRevalidate;
  }

  if (optimisticIntent && !hasPendingOptimisticRevalidation()) {
    markOptimisticShoppingActionSubmitted();
  }

  if (formMethod === "POST" && hasPendingOptimisticRevalidation()) {
    if (shouldFlushOptimisticRevalidation()) {
      resetOptimisticRevalidationPending();
      return defaultShouldRevalidate;
    }

    return false;
  }

  if (formMethod === "POST" && defaultShouldRevalidate) {
    resetOptimisticRevalidationPending();
  }

  return defaultShouldRevalidate;
}
