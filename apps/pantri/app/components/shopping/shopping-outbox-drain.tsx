import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { commitDrainedOutboxEntry } from "~/lib/offline/commit-drained";
import { useNetworkOnline } from "~/lib/offline/connectivity";
import {
  clearActiveDrainEntry,
  getActiveDrainEntry,
  setActiveDrainEntry,
} from "~/lib/offline/drain-active";
import { decideOutboxDrainStep } from "~/lib/offline/drain-decision";
import { subscribeShoppingOfflineChange } from "~/lib/offline/events";
import { listOutbox, markOutboxFailed, peekOutbox } from "~/lib/offline/outbox";
import { scheduleDeferredWork } from "~/lib/offline/schedule-deferred";
import {
  CLIENT_OUTBOX_DRAIN_FIELD,
  SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX,
} from "~/lib/shopping-local-merge";

function drainFields(fields: Record<string, string>) {
  return { ...fields, [CLIENT_OUTBOX_DRAIN_FIELD]: "1" };
}

type DrainPhase = "idle" | "awaiting" | "handling";

/**
 * FIFO-drains the shopping outbox via a React Router fetcher.
 *
 * Phase machine avoids a critical race: after submit(next), the fetcher can
 * still be idle with the *previous* `{ ok: true }` for a moment — treating that
 * as success for the next entry would commit/remove it without the server write.
 * We only consume fetcher.data when phase === "awaiting" (post-submit settle).
 */
export function ShoppingOutboxDrain({ pantryId }: { pantryId: string }) {
  // Wait for the reachability probe — navigator.onLine alone races drain POSTs offline.
  const online = useNetworkOnline();
  const revalidator = useRevalidator();
  const fetcher = useFetcher({ key: `${SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX}${pantryId}` });
  const activeIdRef = useRef<string | null>(getActiveDrainEntry(pantryId));
  const phaseRef = useRef<DrainPhase>(getActiveDrainEntry(pantryId) ? "awaiting" : "idle");
  const wasOfflineRef = useRef(false);
  const pullAfterReconnectRef = useRef(false);
  const [kick, setKick] = useState(0);

  useEffect(() => {
    const bump = () => setKick((value) => value + 1);
    window.addEventListener("focus", bump);
    window.addEventListener("online", bump);
    const unsubscribe = subscribeShoppingOfflineChange(() => bump());
    return () => {
      window.removeEventListener("focus", bump);
      window.removeEventListener("online", bump);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!online) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current) {
      pullAfterReconnectRef.current = true;
      wasOfflineRef.current = false;
    }
  }, [online]);

  useEffect(() => {
    void kick;
    if (!online || fetcher.state !== "idle") return;

    const activeId = activeIdRef.current ?? getActiveDrainEntry(pantryId);

    if (phaseRef.current === "awaiting" && activeId && fetcher.data !== undefined) {
      phaseRef.current = "handling";
      activeIdRef.current = activeId;

      void (async () => {
        const all = await listOutbox(pantryId);
        const active = all.find((entry) => entry.id === activeId) ?? null;
        const pending = all.filter((entry) => entry.status === "pending" && entry.id !== activeId);
        const decision = decideOutboxDrainStep(fetcher.data, activeId, pending[0] ?? null);

        if (decision.remove && active) {
          await commitDrainedOutboxEntry(active);
        } else if (decision.remove) {
          // Entry already gone (remount race).
        } else if (active) {
          await markOutboxFailed(decision.entryId, decision.failReason ?? "Sync failed.");
        }

        const next = decision.next;
        if (!next) {
          activeIdRef.current = null;
          clearActiveDrainEntry(pantryId, activeId);
          phaseRef.current = "idle";
          const afterReconnect = pullAfterReconnectRef.current;
          if (afterReconnect) pullAfterReconnectRef.current = false;
          scheduleDeferredWork(() => revalidator.revalidate(), {
            timeoutMs: afterReconnect ? 500 : 2000,
          });
          return;
        }

        activeIdRef.current = next.id;
        setActiveDrainEntry(pantryId, next.id);
        phaseRef.current = "awaiting";
        fetcher.submit(drainFields(next.fields), {
          method: "post",
          action: next.actionPath,
        });
      })();
      return;
    }

    if (phaseRef.current !== "idle") return;
    if (activeIdRef.current ?? getActiveDrainEntry(pantryId)) return;

    void peekOutbox(pantryId).then((next) => {
      if (!next || phaseRef.current !== "idle") return;
      if (activeIdRef.current || getActiveDrainEntry(pantryId)) return;
      activeIdRef.current = next.id;
      setActiveDrainEntry(pantryId, next.id);
      phaseRef.current = "awaiting";
      fetcher.submit(drainFields(next.fields), { method: "post", action: next.actionPath });
    });
  }, [online, fetcher, fetcher.state, fetcher.data, kick, pantryId, revalidator]);

  return null;
}
