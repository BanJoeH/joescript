import { useEffect } from "react";
import { useRevalidator } from "react-router";

import { getIsOnline, useOnlineStatus } from "~/lib/offline/connectivity";
import { pantryPath } from "~/lib/pantry-path";
import { resetOptimisticRevalidationPending } from "~/lib/pantry-revalidate";

/**
 * Opens an SSE connection to this pantry's `PantryHub` Durable Object and
 * revalidates the current route's loaders whenever another member's
 * mutation bumps the pantry's revision. Mount once per pantry layout.
 * Skips connecting while offline; reconnects when back online.
 */
export function PantryLiveRevalidator({ pantryId, userId }: { pantryId: string; userId: string }) {
  const revalidator = useRevalidator();
  const online = useOnlineStatus();

  useEffect(() => {
    if (!online || !getIsOnline()) return;

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

      resetOptimisticRevalidationPending();
      revalidator.revalidate();
    };

    source.addEventListener("pantry:invalidate", handleInvalidate);

    return () => {
      source.removeEventListener("pantry:invalidate", handleInvalidate);
      source.close();
    };
  }, [online, pantryId, revalidator, userId]);

  return null;
}
