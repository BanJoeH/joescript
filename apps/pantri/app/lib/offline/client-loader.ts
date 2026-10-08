import { getIsOnline, probeOnlineStatus } from "~/lib/offline/connectivity";

function isConnectivityError(error: unknown) {
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === "NetworkError") return true;
  if (
    error instanceof Error &&
    /failed to fetch|networkerror|load failed|failed to get session/i.test(error.message)
  ) {
    return true;
  }
  return false;
}

const OFFLINE_UNCACHED = "You're offline and this page hasn't been cached on this device yet.";

/**
 * Prefer the server loader when online; fall back to a local snapshot on
 * network failure or when the browser reports offline.
 */
export async function loadWithOfflineFallback<T>(options: {
  serverLoader: () => Promise<T>;
  readSnapshot: () => Promise<T | null>;
  /** May return merged data (e.g. server snapshot + pending outbox) for the UI. */
  writeSnapshot: (data: T) => Promise<T | undefined>;
  offline?: boolean;
}): Promise<T> {
  // Wait for the probe so we don't call getSession while navigator.onLine lies.
  if (typeof window !== "undefined" && options.offline === undefined) {
    await probeOnlineStatus();
  }

  const preferOffline = options.offline ?? !getIsOnline();

  if (!preferOffline) {
    try {
      const data = await options.serverLoader();
      const written = await options.writeSnapshot(data);
      return written ?? data;
    } catch (error) {
      const snapshot = await options.readSnapshot();
      if (snapshot) return snapshot;
      if (isConnectivityError(error)) {
        throw new Response(OFFLINE_UNCACHED, { status: 503, statusText: "Offline" });
      }
      throw error;
    }
  }

  const snapshot = await options.readSnapshot();
  if (snapshot) return snapshot;

  // Don't call server loaders (getSession etc.) when we already know we're offline.
  if (!getIsOnline()) {
    throw new Response(OFFLINE_UNCACHED, { status: 503, statusText: "Offline" });
  }

  // Last resort: navigator/probe disagreed — try the network once.
  try {
    const data = await options.serverLoader();
    const written = await options.writeSnapshot(data);
    return written ?? data;
  } catch {
    throw new Response(OFFLINE_UNCACHED, { status: 503, statusText: "Offline" });
  }
}
