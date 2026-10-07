import { useEffect } from "react";
import { useRevalidator } from "react-router";

import {
  OUTBOX_CHANGED_EVENT,
  type OutboxChangedDetail,
} from "~/lib/offline/connectivity";
import { startOutboxDrainLoop } from "~/lib/offline/outbox";

/** Drains the offline mutation outbox when the app is online. */
export function OutboxDrain() {
  const revalidator = useRevalidator();

  useEffect(() => {
    return startOutboxDrainLoop();
  }, []);

  useEffect(() => {
    function onOutboxChanged(event: Event) {
      const detail = (event as CustomEvent<OutboxChangedDetail>).detail;
      // Drain loop owns fetching; only revalidate after successful sends.
      if ((detail?.sent ?? 0) > 0) {
        revalidator.revalidate();
      }
    }

    window.addEventListener(OUTBOX_CHANGED_EVENT, onOutboxChanged);
    return () => {
      window.removeEventListener(OUTBOX_CHANGED_EVENT, onOutboxChanged);
    };
  }, [revalidator]);

  return null;
}
