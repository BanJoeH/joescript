import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  markOptimisticShoppingActionSubmitted,
  OPTIMISTIC_REVALIDATE_AFTER_ACTIONS,
  OPTIMISTIC_REVALIDATE_AFTER_MS,
  resetOptimisticRevalidationPending,
  shouldFlushOptimisticRevalidation,
  shouldRevalidatePantryRoutes,
} from "~/lib/pantry-revalidate";

function toggleFormData() {
  const formData = new FormData();
  formData.set("intent", "toggle-ingredient");
  return formData;
}

describe("shouldRevalidatePantryRoutes", () => {
  beforeEach(() => {
    resetOptimisticRevalidationPending();
  });

  it("skips revalidation until the action threshold is reached", () => {
    for (let index = 0; index < OPTIMISTIC_REVALIDATE_AFTER_ACTIONS - 1; index += 1) {
      markOptimisticShoppingActionSubmitted();
      expect(
        shouldRevalidatePantryRoutes({
          formMethod: "POST",
          defaultShouldRevalidate: true,
        }),
      ).toBe(false);
    }

    markOptimisticShoppingActionSubmitted();
    expect(
      shouldRevalidatePantryRoutes({
        formMethod: "POST",
        defaultShouldRevalidate: true,
      }),
    ).toBe(true);
  });

  it("skips revalidation on the first action before formData is visible to shouldRevalidate", () => {
    markOptimisticShoppingActionSubmitted();

    expect(
      shouldRevalidatePantryRoutes({
        formMethod: "POST",
        defaultShouldRevalidate: true,
      }),
    ).toBe(false);
  });

  it("flushes after the time threshold even with fewer actions", () => {
    const now = 5_000_000;
    vi.setSystemTime(now);

    markOptimisticShoppingActionSubmitted();

    expect(shouldFlushOptimisticRevalidation(now + OPTIMISTIC_REVALIDATE_AFTER_MS - 1)).toBe(false);
    expect(shouldFlushOptimisticRevalidation(now + OPTIMISTIC_REVALIDATE_AFTER_MS)).toBe(true);

    vi.useRealTimers();
  });

  it("clears pending state on non-optimistic mutations that revalidate", () => {
    markOptimisticShoppingActionSubmitted();

    const deleteFormData = new FormData();
    deleteFormData.set("intent", "delete");

    expect(
      shouldRevalidatePantryRoutes({
        formMethod: "POST",
        formData: deleteFormData,
        defaultShouldRevalidate: true,
      }),
    ).toBe(true);
    expect(shouldFlushOptimisticRevalidation()).toBe(false);
  });

  it("does not double-count when multiple routes share the same action", () => {
    markOptimisticShoppingActionSubmitted();

    expect(
      shouldRevalidatePantryRoutes({
        formMethod: "POST",
        formData: toggleFormData(),
        defaultShouldRevalidate: true,
      }),
    ).toBe(false);
    expect(
      shouldRevalidatePantryRoutes({
        formMethod: "POST",
        formData: toggleFormData(),
        defaultShouldRevalidate: true,
      }),
    ).toBe(false);
  });
});
