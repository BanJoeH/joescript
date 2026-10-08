/**
 * Batched skip-revalidation is disabled. Delayed flushes remapped index-keyed
 * purchased overrides onto the wrong odd bits (e.g. banana → tomato after 10s).
 */

type RevalidateArgs = {
  formMethod?: string;
  formData?: FormData;
  defaultShouldRevalidate: boolean;
};

/** @deprecated Batching off — kept for call-site compatibility. */
export const OPTIMISTIC_REVALIDATE_AFTER_ACTIONS = 1;

/** @deprecated Batching off — kept for call-site compatibility. */
export const OPTIMISTIC_REVALIDATE_AFTER_MS = 0;

export function resetOptimisticRevalidationPending() {}

export function hasPendingOptimisticRevalidation() {
  return false;
}

export function shouldFlushOptimisticRevalidation(_now = Date.now()) {
  return false;
}

/** @deprecated Batching off — no-op. */
export function markOptimisticShoppingActionSubmitted() {}

export function shouldRevalidatePantryRoutes({ defaultShouldRevalidate }: RevalidateArgs) {
  return defaultShouldRevalidate;
}
