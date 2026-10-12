import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";

import { useOnlineStatus } from "~/lib/offline/connectivity";
import { decideOutboxDrainStep } from "~/lib/offline/drain-decision";
import { subscribeShoppingOfflineChange } from "~/lib/offline/events";
import { listOutbox, markOutboxFailed, peekOutbox, removeOutboxEntry } from "~/lib/offline/outbox";

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

      void (async () => {
        const pending = (await listOutbox(pantryId)).filter(
          (entry) => entry.status === "pending" && entry.id !== entryId,
        );
        const decision = decideOutboxDrainStep(fetcher.data, entryId, pending[0] ?? null);

        if (decision.remove) {
          await removeOutboxEntry(decision.entryId);
        } else {
          await markOutboxFailed(decision.entryId, decision.failReason ?? "Sync failed.");
        }
        activeIdRef.current = null;

        if (decision.shouldRevalidate) {
          revalidator.revalidate();
          return;
        }
        if (!decision.next) return;
        activeIdRef.current = decision.next.id;
        lastHandledRef.current = null;
        fetcher.submit(decision.next.fields, {
          method: "post",
          action: decision.next.actionPath,
        });
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
