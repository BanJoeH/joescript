import { getIsOnline } from "~/lib/offline/connectivity";

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
  const preferOffline = options.offline ?? !getIsOnline();

  if (!preferOffline) {
    try {
      const data = await options.serverLoader();
      const written = await options.writeSnapshot(data);
      return written ?? data;
    } catch (error) {
      const snapshot = await options.readSnapshot();
      if (snapshot) return snapshot;
      throw error;
    }
  }

  const snapshot = await options.readSnapshot();
  if (snapshot) return snapshot;

  // Last resort: try the network even if navigator says offline.
  try {
    const data = await options.serverLoader();
    const written = await options.writeSnapshot(data);
    return written ?? data;
  } catch {
    throw new Response("You're offline and this page hasn't been cached on this device yet.", {
      status: 503,
      statusText: "Offline",
    });
  }
}
