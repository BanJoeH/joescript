import { useEffect, useRef } from "react";
import { useRevalidator } from "react-router";

import { canUseNetwork, useNetworkOnline } from "~/lib/offline/connectivity";
import { pantryPath } from "~/lib/pantry-path";

/** Coalesce visibility storms from the same tab return. */
const FOCUS_REVALIDATE_COOLDOWN_MS = 750;

/**
 * Keeps pantry loaders fresh while the tab is in use:
 * - SSE invalidate from other members
 * - refetch when reachability becomes online (probe settle / reconnect)
 * - refetch when the tab becomes visible again (TanStack Query-style)
 *
 * Mount once per pantry layout.
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

    const maybeRevalidate = () => {
      if (!canUseNetwork()) return;
      if (document.visibilityState === "hidden") return;
      if (revalidatorRef.current.state !== "idle") return;
      const now = Date.now();
      if (now - lastFocusRevalidateAt.current < FOCUS_REVALIDATE_COOLDOWN_MS) return;
      lastFocusRevalidateAt.current = now;
      void revalidatorRef.current.revalidate();
    };

    // Probe often settles after the visibility event that woke us.
    maybeRevalidate();

    // TanStack Query focusManager: visibilitychange only.
    // Chrome DevTools → Rendering → "Emulate a focused page" blocks this event.
    const onVisibility = () => {
      if (document.visibilityState === "visible") maybeRevalidate();
    };
    window.addEventListener("visibilitychange", onVisibility);
    return () => window.removeEventListener("visibilitychange", onVisibility);
  }, [online]);

  return null;
}
