import { describe, expect, it } from "vitest";

import { isOfflineShellPath, offlineShellUrls } from "~/lib/offline/offline-shell-paths";

describe("isOfflineShellPath", () => {
  it("accepts shopping, sorted, recipes list, and recipe detail", () => {
    expect(isOfflineShellPath("/p1/shopping")).toBe(true);
    expect(isOfflineShellPath("/p1/shopping/")).toBe(true);
    expect(isOfflineShellPath("/p1/shopping/sorted")).toBe(true);
    expect(isOfflineShellPath("/p1/recipes")).toBe(true);
    expect(isOfflineShellPath("/p1/recipes/")).toBe(true);
    expect(isOfflineShellPath("/p1/recipes/abc-123")).toBe(true);
  });

  it("rejects recipe edit/new/import and unrelated routes", () => {
    expect(isOfflineShellPath("/p1/recipes/new")).toBe(false);
    expect(isOfflineShellPath("/p1/recipes/import-photos")).toBe(false);
    expect(isOfflineShellPath("/p1/recipes/abc/edit")).toBe(false);
    expect(isOfflineShellPath("/p1/photos/abc")).toBe(false);
    expect(isOfflineShellPath("/p1/settings")).toBe(false);
    expect(isOfflineShellPath("/p1")).toBe(false);
    expect(isOfflineShellPath("/")).toBe(false);
    expect(isOfflineShellPath("/r/token")).toBe(false);
  });
});

describe("offlineShellUrls", () => {
  it("returns shopping, sorted, and recipes list for a pantry", () => {
    expect(offlineShellUrls("abc")).toEqual([
      "/abc/shopping",
      "/abc/shopping/sorted",
      "/abc/recipes",
    ]);
  });
});
