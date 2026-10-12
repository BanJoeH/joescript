import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";

import { useOnlineStatus } from "~/lib/offline/connectivity";
import { subscribeShoppingOfflineChange } from "~/lib/offline/events";
import { interpretActionData } from "~/lib/offline/interpret-action-data";
import { markOutboxFailed, peekOutbox, removeOutboxEntry } from "~/lib/offline/outbox";

/**
 * FIFO-drains the shopping outbox via a React Router fetcher so success is
 * judged from action JSON (`{ ok: true }` / `{ error }`), not HTTP/HTML.
 */
export function ShoppingOutboxDrain({ pantryId }: { pantryId: string }) {
  const online = useOnlineStatus();
  const revalidator = useRevalidator();
  const fetcher = useFetcher({ key: `shopping-outbox-drain:${pantryId}` });
  const activeIdRef = useRef<string | null>(null);
  const lastHandledRef = useRef<unknown>(null);
  const [kick, setKick] = useState(0);

  useEffect(() => {
    const bump = () => setKick((value) => value + 1);
    window.addEventListener("focus", bump);
    window.addEventListener("online", bump);
    const unsubscribe = subscribeShoppingOfflineChange(bump);
    return () => {
      window.removeEventListener("focus", bump);
      window.removeEventListener("online", bump);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // `kick` restarts drain after focus / online / outbox changes.
    void kick;
    if (!online || fetcher.state !== "idle") return;

    if (
      activeIdRef.current &&
      fetcher.data !== undefined &&
      fetcher.data !== lastHandledRef.current
    ) {
      lastHandledRef.current = fetcher.data;
      const entryId = activeIdRef.current;
      const result = interpretActionData(fetcher.data);

      void (async () => {
        if (result.ok) {
          await removeOutboxEntry(entryId);
        } else {
          await markOutboxFailed(entryId, result.reason);
        }
        activeIdRef.current = null;

        const next = await peekOutbox(pantryId);
        if (!next) {
          revalidator.revalidate();
          return;
        }
        activeIdRef.current = next.id;
        lastHandledRef.current = null;
        fetcher.submit(next.fields, { method: "post", action: next.actionPath });
      })();
      return;
    }

    if (activeIdRef.current) return;

    void peekOutbox(pantryId).then((next) => {
      if (!next || activeIdRef.current) return;
      activeIdRef.current = next.id;
      lastHandledRef.current = null;
      fetcher.submit(next.fields, { method: "post", action: next.actionPath });
    });
  }, [online, fetcher, fetcher.state, fetcher.data, kick, pantryId, revalidator]);

  return null;
}
