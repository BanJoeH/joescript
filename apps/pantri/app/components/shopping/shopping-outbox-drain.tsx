import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";

import { useOnlineStatus } from "~/lib/offline/connectivity";
import { commitDrainedOutboxEntry } from "~/lib/offline/commit-drained";
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

/**
 * FIFO-drains the shopping outbox via a React Router fetcher so success is
 * judged from action JSON (`{ ok: true }` / `{ error }`), not HTTP/HTML.
 *
 * Mid-queue drain posts skip loader revalidation. Each success is folded into
 * the snapshot base before outbox remove. When the queue empties, a server pull
 * is scheduled as deferred/idle work (coalesced across rapid toggles) so online
 * interactions stay as snappy as offline.
 */
export function ShoppingOutboxDrain({ pantryId }: { pantryId: string }) {
  const online = useOnlineStatus();
  const revalidator = useRevalidator();
  const fetcher = useFetcher({ key: `${SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX}${pantryId}` });
  const activeIdRef = useRef<string | null>(getActiveDrainEntry(pantryId));
  const lastHandledRef = useRef<unknown>(null);
  const wasOfflineRef = useRef(!online);
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
    if (activeId) activeIdRef.current = activeId;

    if (activeId && fetcher.data !== undefined && fetcher.data !== lastHandledRef.current) {
      lastHandledRef.current = fetcher.data;
      const entryId = activeId;

      void (async () => {
        const all = await listOutbox(pantryId);
        const active = all.find((entry) => entry.id === entryId) ?? null;
        const pending = all.filter((entry) => entry.status === "pending" && entry.id !== entryId);
        const decision = decideOutboxDrainStep(fetcher.data, entryId, pending[0] ?? null);

        if (decision.remove && active) {
          await commitDrainedOutboxEntry(active);
        } else if (decision.remove) {
          // Entry already gone (remount race) — nothing to fold.
        } else if (active) {
          await markOutboxFailed(decision.entryId, decision.failReason ?? "Sync failed.");
        }
        activeIdRef.current = null;
        clearActiveDrainEntry(pantryId, entryId);

        const next = decision.next;

        if (!next) {
          const afterReconnect = pullAfterReconnectRef.current;
          if (afterReconnect) pullAfterReconnectRef.current = false;
          // Reconnect: pull sooner. Quiet online drains: idle/deferred + coalesce.
          scheduleDeferredWork(() => revalidator.revalidate(), {
            timeoutMs: afterReconnect ? 500 : 2000,
          });
          return;
        }
        activeIdRef.current = next.id;
        setActiveDrainEntry(pantryId, next.id);
        lastHandledRef.current = null;
        fetcher.submit(drainFields(next.fields), {
          method: "post",
          action: next.actionPath,
        });
      })();
      return;
    }

    if (activeIdRef.current ?? getActiveDrainEntry(pantryId)) return;

    void peekOutbox(pantryId).then((next) => {
      if (!next || activeIdRef.current || getActiveDrainEntry(pantryId)) return;
      activeIdRef.current = next.id;
      setActiveDrainEntry(pantryId, next.id);
      lastHandledRef.current = null;
      fetcher.submit(drainFields(next.fields), { method: "post", action: next.actionPath });
    });
  }, [online, fetcher, fetcher.state, fetcher.data, kick, pantryId, revalidator]);

  return null;
}
