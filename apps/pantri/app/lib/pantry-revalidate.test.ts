import { describe, expect, it } from "vitest";

import {
  markOptimisticShoppingActionSubmitted,
  shouldFlushOptimisticRevalidation,
  shouldRevalidatePantryRoutes,
} from "~/lib/pantry-revalidate";

describe("shouldRevalidatePantryRoutes", () => {
  it("always follows the router default while batching is off", () => {
    markOptimisticShoppingActionSubmitted();

    expect(
      shouldRevalidatePantryRoutes({
        formMethod: "POST",
        defaultShouldRevalidate: true,
      }),
    ).toBe(true);

    const toggle = new FormData();
    toggle.set("intent", "toggle-odd-bit");
    expect(
      shouldRevalidatePantryRoutes({
        formMethod: "POST",
        formData: toggle,
        defaultShouldRevalidate: true,
      }),
    ).toBe(true);

    expect(shouldFlushOptimisticRevalidation()).toBe(false);
  });
});
