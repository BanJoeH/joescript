import { describe, expect, it, vi } from "vitest";

import { loadWithOfflineFallback } from "~/lib/offline/client-loader";

describe("loadWithOfflineFallback", () => {
  it("uses server data and writes snapshot when online", async () => {
    const serverData = { pantryId: "p1", recipes: [{ id: "r1" }] };
    const writeSnapshot = vi.fn(async () => undefined);
    const readSnapshot = vi.fn(async () => null);

    const result = await loadWithOfflineFallback({
      offline: false,
      serverLoader: async () => serverData,
      readSnapshot,
      writeSnapshot,
    });

    expect(result).toEqual(serverData);
    expect(writeSnapshot).toHaveBeenCalledWith(serverData);
    expect(readSnapshot).not.toHaveBeenCalled();
  });

  it("returns merged data from writeSnapshot when provided", async () => {
    const serverData = { pantryId: "p1", recipes: [{ id: "server" }] };
    const merged = { pantryId: "p1", recipes: [{ id: "pending" }] };

    const result = await loadWithOfflineFallback({
      offline: false,
      serverLoader: async () => serverData,
      readSnapshot: async () => null,
      writeSnapshot: async () => merged,
    });

    expect(result).toEqual(merged);
  });

  it("falls back to snapshot when serverLoader fails", async () => {
    const snapshot = { pantryId: "p1", recipes: [] };
    const result = await loadWithOfflineFallback({
      offline: false,
      serverLoader: async () => {
        throw new Error("network");
      },
      readSnapshot: async () => snapshot,
      writeSnapshot: async () => undefined,
    });

    expect(result).toEqual(snapshot);
  });

  it("returns snapshot when offline without hitting the network first", async () => {
    const snapshot = { pantryId: "p1", recipes: [{ id: "cached" }] };
    const serverLoader = vi.fn(async () => ({ pantryId: "p1", recipes: [] }));

    const result = await loadWithOfflineFallback({
      offline: true,
      serverLoader,
      readSnapshot: async () => snapshot,
      writeSnapshot: async () => undefined,
    });

    expect(result).toEqual(snapshot);
    expect(serverLoader).not.toHaveBeenCalled();
  });
});
