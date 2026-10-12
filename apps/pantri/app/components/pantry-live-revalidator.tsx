import { useEffect, useRef } from "react";
import { useRevalidator } from "react-router";

import { useNetworkOnline } from "~/lib/offline/connectivity";
import { pantryPath } from "~/lib/pantry-path";

/** Coalesce visibility + window focus from the same tab return. */
const FOCUS_REVALIDATE_COOLDOWN_MS = 1000;

/**
 * Keeps pantry loaders fresh while the tab is in use:
 * - SSE invalidate from other members
 * - refetch when returning to the tab/window (react-query-style)
 *
 * Mount once per pantry layout. Skips network work until the reachability probe
 * settles online (avoids shopping.data POSTs / loader fetches on offline refresh).
 */
export function PantryLiveRevalidator({ pantryId, userId }: { pantryId: string; userId: string }) {
  const revalidator = useRevalidator();
  const online = useNetworkOnline();
  const revalidatorRef = useRef(revalidator);
  const lastFocusRevalidateAt = useRef(0);
  revalidatorRef.current = revalidator;

  useEffect(() => {
    if (!online) return;

    const source = new EventSource(pantryPath(pantryId, "api/events"));

    const handleInvalidate = (event: Event) => {
      try {
        const message = event as MessageEvent<string>;
        const data = JSON.parse(message.data) as { actorId?: string | null };
        if (data.actorId && data.actorId === userId) {
          return;
        }
      } catch {
        // Ignore malformed payloads; still revalidate other clients.
      }

      revalidatorRef.current.revalidate();
    };

    source.addEventListener("pantry:invalidate", handleInvalidate);

    return () => {
      source.removeEventListener("pantry:invalidate", handleInvalidate);
      source.close();
    };
  }, [online, pantryId, userId]);

  useEffect(() => {
    if (!online) return;

    // Only revalidate when coming *back* from hidden — not on the initial visible mount.
    let wasHidden = document.visibilityState === "hidden";

    const maybeRevalidate = () => {
      if (document.visibilityState === "hidden") return;
      if (revalidatorRef.current.state !== "idle") return;
      const now = Date.now();
      if (now - lastFocusRevalidateAt.current < FOCUS_REVALIDATE_COOLDOWN_MS) return;
      lastFocusRevalidateAt.current = now;
      void revalidatorRef.current.revalidate();
    };

    const onVisibility = () => {
      const hidden = document.visibilityState === "hidden";
      if (wasHidden && !hidden) maybeRevalidate();
      wasHidden = hidden;
    };

    const onWindowFocus = () => {
      maybeRevalidate();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [online]);

  return null;
}
