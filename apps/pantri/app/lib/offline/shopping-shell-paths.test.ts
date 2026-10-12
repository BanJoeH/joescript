import { describe, expect, it } from "vitest";

import { isShoppingShellPath, shoppingShellUrls } from "~/lib/offline/shopping-shell-paths";

describe("isShoppingShellPath", () => {
  it("accepts shopping and sorted shells", () => {
    expect(isShoppingShellPath("/p1/shopping")).toBe(true);
    expect(isShoppingShellPath("/p1/shopping/")).toBe(true);
    expect(isShoppingShellPath("/p1/shopping/sorted")).toBe(true);
    expect(isShoppingShellPath("/p1/shopping/sorted/")).toBe(true);
  });

  it("rejects recipes, photos, settings, and nested junk", () => {
    expect(isShoppingShellPath("/p1/recipes")).toBe(false);
    expect(isShoppingShellPath("/p1/shopping/recipes")).toBe(false);
    expect(isShoppingShellPath("/p1/photos/abc")).toBe(false);
    expect(isShoppingShellPath("/p1/settings")).toBe(false);
    expect(isShoppingShellPath("/p1")).toBe(false);
    expect(isShoppingShellPath("/")).toBe(false);
    expect(isShoppingShellPath("/r/token")).toBe(false);
  });
});

describe("shoppingShellUrls", () => {
  it("returns shopping then sorted for a pantry", () => {
    expect(shoppingShellUrls("abc")).toEqual(["/abc/shopping", "/abc/shopping/sorted"]);
  });
});
