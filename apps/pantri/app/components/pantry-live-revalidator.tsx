import { useEffect } from "react";
import { useRevalidator } from "react-router";

import { pantryPath } from "~/lib/pantry-path";

/**
 * Opens an SSE connection to this pantry's `PantryHub` Durable Object and
 * revalidates the current route's loaders whenever another member's
 * mutation bumps the pantry's revision. Mount once per pantry layout.
 */
export function PantryLiveRevalidator({ pantryId }: { pantryId: string }) {
  const revalidator = useRevalidator();

  useEffect(() => {
    const source = new EventSource(pantryPath(pantryId, "api/events"));

    const handleInvalidate = () => {
      revalidator.revalidate();
    };

    source.addEventListener("pantry:invalidate", handleInvalidate);

    return () => {
      source.removeEventListener("pantry:invalidate", handleInvalidate);
      source.close();
    };
  }, [pantryId, revalidator]);

  return null;
}
