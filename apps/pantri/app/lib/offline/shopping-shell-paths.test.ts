import { describe, expect, it } from "vitest";

import { isShoppingShellPath, shoppingShellUrls } from "~/lib/offline/shopping-shell-paths";

describe("shopping-shell-paths re-exports", () => {
  it("keeps legacy helpers covering shopping and recipes shells", () => {
    expect(isShoppingShellPath("/p1/shopping")).toBe(true);
    expect(isShoppingShellPath("/p1/recipes")).toBe(true);
    expect(isShoppingShellPath("/p1/recipes/new")).toBe(false);
    expect(shoppingShellUrls("abc")).toEqual([
      "/abc/shopping",
      "/abc/shopping/sorted",
      "/abc/recipes",
    ]);
  });
});
