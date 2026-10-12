import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetShoppingOfflineDbForTests } from "~/lib/offline/db";
import { readPantryLayoutSnapshot, writePantryLayoutSnapshot } from "~/lib/offline/layout-snapshot";

const pantryId = "layout-pantry";

beforeEach(async () => {
  await resetShoppingOfflineDbForTests();
});

afterEach(async () => {
  await resetShoppingOfflineDbForTests();
});

describe("pantry layout snapshot", () => {
  it("round-trips loader data for offline hydrate", async () => {
    await writePantryLayoutSnapshot({
      pantryId,
      pantryName: "Home",
      pantries: [{ id: pantryId, name: "Home" }],
      user: {
        id: "u1",
        email: "a@b.co",
        name: "Ada",
        emailVerified: true,
        image: null,
        createdAt: new Date("2020-01-01T00:00:00.000Z"),
        updatedAt: new Date("2020-02-01T00:00:00.000Z"),
      },
    });

    const loaded = await readPantryLayoutSnapshot(pantryId);
    expect(loaded?.pantryName).toBe("Home");
    expect(loaded?.user.id).toBe("u1");
    expect(loaded?.user.createdAt.toISOString()).toBe("2020-01-01T00:00:00.000Z");
    expect(loaded?.pantries).toEqual([{ id: pantryId, name: "Home" }]);
  });

  it("returns null when missing", async () => {
    expect(await readPantryLayoutSnapshot("missing")).toBeNull();
  });
});
