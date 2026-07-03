/** biome-ignore-all lint/style/noNonNullAssertion: <allowed for testing> */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearMemoryCacheForTests,
  seedCorruptMemoryCacheForTests,
  withCache,
} from "~/lib/cache.server";

describe("withCache", () => {
  afterEach(() => {
    clearMemoryCacheForTests();
  });

  it("returns cached values without calling the loader again", async () => {
    const loader = vi.fn().mockResolvedValue(["lavender"]);

    const first = await withCache("perenual", "search:lavender", 3600, loader);
    const second = await withCache("perenual", "search:lavender", 3600, loader);

    expect(first).toEqual(["lavender"]);
    expect(second).toEqual(["lavender"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("caches empty arrays", async () => {
    const loader = vi.fn().mockResolvedValue([]);

    await withCache("perenual", "search:missing", 3600, loader);
    await withCache("perenual", "search:missing", 3600, loader);

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent loaders for the same key", async () => {
    let resolveLoader: (value: string[]) => void;
    const loaderPromise = new Promise<string[]>((resolve) => {
      resolveLoader = resolve;
    });
    const loader = vi.fn(() => loaderPromise);

    const first = withCache("perenual", "search:rose", 3600, loader);
    const second = withCache("perenual", "search:rose", 3600, loader);

    resolveLoader!(["rose"]);
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toEqual(["rose"]);
    expect(secondResult).toEqual(["rose"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("treats corrupt memory cache entries as a miss", async () => {
    seedCorruptMemoryCacheForTests("perenual", "search:mint");
    const loader = vi.fn().mockResolvedValue(["mint"]);

    const result = await withCache("perenual", "search:mint", 3600, loader);

    expect(result).toEqual(["mint"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
