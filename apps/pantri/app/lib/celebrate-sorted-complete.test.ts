import { describe, expect, it } from "vitest";

import { shouldCelebrateSortedComplete } from "./celebrate-sorted-complete";

describe("shouldCelebrateSortedComplete", () => {
  it("does not fire before the page is ready", () => {
    expect(shouldCelebrateSortedComplete(1, 0, false)).toBe(false);
  });

  it("does not fire on the first observation (no previous count)", () => {
    expect(shouldCelebrateSortedComplete(null, 0, true)).toBe(false);
    expect(shouldCelebrateSortedComplete(null, 3, true)).toBe(false);
  });

  it("fires only when remaining goes from positive to zero", () => {
    expect(shouldCelebrateSortedComplete(1, 0, true)).toBe(true);
    expect(shouldCelebrateSortedComplete(4, 0, true)).toBe(true);
  });

  it("does not fire when remaining stays positive or rises again", () => {
    expect(shouldCelebrateSortedComplete(2, 1, true)).toBe(false);
    expect(shouldCelebrateSortedComplete(0, 0, true)).toBe(false);
    expect(shouldCelebrateSortedComplete(0, 1, true)).toBe(false);
  });
});
