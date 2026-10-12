import { useEffect, useRef } from "react";
import { useRevalidator } from "react-router";

import { useOnlineStatus } from "~/lib/offline/connectivity";
import { pantryPath } from "~/lib/pantry-path";

/** Ignore bursty focus + visibility + pageshow from the same tab switch. */
const FOCUS_REVALIDATE_COOLDOWN_MS = 1000;

/**
 * Keeps pantry loaders fresh while the tab is in use:
 * - SSE invalidate from other members
 * - refetch on window focus / pageshow / visible (react-query-style)
 *
 * Mount once per pantry layout. Skips network work while offline.
 */
export function PantryLiveRevalidator({ pantryId, userId }: { pantryId: string; userId: string }) {
  const revalidator = useRevalidator();
  const online = useOnlineStatus();
  const lastFocusRevalidateAt = useRef(0);

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

      revalidator.revalidate();
    };

    source.addEventListener("pantry:invalidate", handleInvalidate);

    return () => {
      source.removeEventListener("pantry:invalidate", handleInvalidate);
      source.close();
    };
  }, [online, pantryId, revalidator, userId]);

  useEffect(() => {
    if (!online) return;

    const revalidateOnFocus = () => {
      if (revalidator.state !== "idle") return;
      const now = Date.now();
      if (now - lastFocusRevalidateAt.current < FOCUS_REVALIDATE_COOLDOWN_MS) return;
      lastFocusRevalidateAt.current = now;
      void revalidator.revalidate();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") revalidateOnFocus();
    };

    window.addEventListener("focus", revalidateOnFocus);
    window.addEventListener("pageshow", revalidateOnFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", revalidateOnFocus);
      window.removeEventListener("pageshow", revalidateOnFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [online, revalidator]);

  return null;
}
