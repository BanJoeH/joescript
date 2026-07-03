const CACHE_ORIGIN = "https://garden-cache.internal";

type MemoryEntry = {
  expiresAt: number;
  value: string;
};

const memoryCache = new Map<string, MemoryEntry>();
const inFlight = new Map<string, Promise<unknown>>();

function memoryKey(namespace: string, key: string) {
  return `${namespace}:${key}`;
}

function cacheRequest(namespace: string, key: string) {
  return new Request(`${CACHE_ORIGIN}/${namespace}/${encodeURIComponent(key)}`);
}

type WorkerCache = Cache & {
  put(
    request: RequestInfo,
    response: Response,
    options?: { expirationTtl?: number },
  ): Promise<void>;
};

function parseCachedValue<T>(serialized: string): T | undefined {
  try {
    return JSON.parse(serialized) as T;
  } catch {
    return undefined;
  }
}

export async function cacheGet<T>(namespace: string, key: string): Promise<T | undefined> {
  const memKey = memoryKey(namespace, key);
  const memEntry = memoryCache.get(memKey);
  if (memEntry) {
    if (memEntry.expiresAt > Date.now()) {
      const value = parseCachedValue<T>(memEntry.value);
      if (value !== undefined) {
        return value;
      }
    }
    memoryCache.delete(memKey);
  }

  if (typeof caches === "undefined") {
    return undefined;
  }

  try {
    const cache = await caches.open(namespace);
    const response = await cache.match(cacheRequest(namespace, key));
    if (!response) {
      return undefined;
    }

    const value = (await response.json()) as T;
    memoryCache.set(memKey, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return value;
  } catch {
    return undefined;
  }
}

export async function cacheSet<T>(namespace: string, key: string, value: T, ttlSeconds: number) {
  const serialized = JSON.stringify(value);
  memoryCache.set(memoryKey(namespace, key), {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  if (typeof caches === "undefined") {
    return;
  }

  try {
    const cache = (await caches.open(namespace)) as WorkerCache;
    const response = new Response(serialized, {
      headers: { "Content-Type": "application/json" },
    });
    await cache.put(cacheRequest(namespace, key), response, {
      expirationTtl: ttlSeconds,
    });
  } catch {
    // Cache writes are best-effort.
  }
}

export async function withCache<T>(
  namespace: string,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(namespace, key);
  if (cached !== undefined) {
    return cached;
  }

  const dedupeKey = memoryKey(namespace, key);
  const pending = inFlight.get(dedupeKey);
  if (pending) {
    return (await pending) as T;
  }

  const promise = (async () => {
    const rechecked = await cacheGet<T>(namespace, key);
    if (rechecked !== undefined) {
      return rechecked;
    }

    const value = await loader();
    await cacheSet(namespace, key, value, ttlSeconds);
    return value;
  })();

  inFlight.set(dedupeKey, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(dedupeKey);
  }
}

export function clearMemoryCacheForTests() {
  memoryCache.clear();
  inFlight.clear();
}

export function seedCorruptMemoryCacheForTests(namespace: string, key: string) {
  memoryCache.set(memoryKey(namespace, key), {
    value: "{not-json",
    expiresAt: Date.now() + 60_000,
  });
}
