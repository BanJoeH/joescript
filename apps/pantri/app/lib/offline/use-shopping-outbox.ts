import { useCallback, useEffect, useState } from "react";

import { subscribeShoppingOfflineChange } from "~/lib/offline/events";
import { countOutbox, listOutbox } from "~/lib/offline/outbox";
import type { OutboxEntry } from "~/lib/offline/types";

export function useShoppingOutbox(pantryId: string) {
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);

  const refresh = useCallback(async () => {
    const [next, counts] = await Promise.all([listOutbox(pantryId), countOutbox(pantryId)]);
    setEntries(next);
    setPending(counts.pending);
    setFailed(counts.failed);
  }, [pantryId]);

  useEffect(() => {
    void refresh();
    return subscribeShoppingOfflineChange(() => {
      void refresh();
    });
  }, [refresh]);

  return { entries, pending, failed, refresh };
}
