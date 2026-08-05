import { useEffect } from "react";
import { useRevalidator } from "react-router";

import {
  hasPendingOptimisticRevalidation,
  resetOptimisticRevalidationPending,
  shouldFlushOptimisticRevalidation,
} from "~/lib/pantry-revalidate";

/** Flush batched optimistic shopping mutations once action/time thresholds are met. */
export function OptimisticRevalidationFlush() {
  const revalidator = useRevalidator();

  useEffect(() => {
    const tick = () => {
      if (!hasPendingOptimisticRevalidation()) {
        return;
      }

      if (shouldFlushOptimisticRevalidation()) {
        resetOptimisticRevalidationPending();
        revalidator.revalidate();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [revalidator]);

  return null;
}
