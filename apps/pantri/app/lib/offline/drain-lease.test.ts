import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetShoppingOfflineDbForTests } from "~/lib/offline/db";
import {
  releaseDrainLease,
  resetDrainOwnerIdForTests,
  tryAcquireDrainLease,
} from "~/lib/offline/drain-lease";

beforeEach(async () => {
  resetDrainOwnerIdForTests();
  await resetShoppingOfflineDbForTests();
});

afterEach(async () => {
  resetDrainOwnerIdForTests();
  await resetShoppingOfflineDbForTests();
});

describe("drain lease", () => {
  it("lets one owner hold the lease and blocks another until expiry", async () => {
    expect(await tryAcquireDrainLease("p1", "e1", "tab-a", 1_000)).toBe(true);
    expect(await tryAcquireDrainLease("p1", "e1", "tab-b", 1_100)).toBe(false);
    expect(await tryAcquireDrainLease("p1", "e2", "tab-a", 1_200)).toBe(true);
  });

  it("allows steal after the lease expires", async () => {
    expect(await tryAcquireDrainLease("p1", "e1", "tab-a", 1_000)).toBe(true);
    expect(await tryAcquireDrainLease("p1", "e1", "tab-b", 20_000)).toBe(true);
  });

  it("release frees the lease for another owner", async () => {
    expect(await tryAcquireDrainLease("p1", "e1", "tab-a", 1_000)).toBe(true);
    await releaseDrainLease("p1", "tab-a");
    expect(await tryAcquireDrainLease("p1", "e1", "tab-b", 1_100)).toBe(true);
  });
});
