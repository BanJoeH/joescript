import { describe, expect, it, vi } from "vitest";

import { findRecipeByShareTokenForUser } from "./recipe-share-lookup.server";

describe("findRecipeByShareTokenForUser", () => {
  it("returns null for invalid tokens without querying", async () => {
    const db = {
      select: vi.fn(),
    };

    await expect(
      findRecipeByShareTokenForUser(db as never, "user-1", "not-a-token"),
    ).resolves.toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });
});
