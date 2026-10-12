import { useEffect, useRef, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";

import { useOnlineStatus } from "~/lib/offline/connectivity";
import { decideOutboxDrainStep } from "~/lib/offline/drain-decision";
import { subscribeShoppingOfflineChange } from "~/lib/offline/events";
import {
  enqueueOutbox,
  listOutbox,
  markOutboxFailed,
  peekOutbox,
  removeOutboxEntry,
} from "~/lib/offline/outbox";
import { pantryPath } from "~/lib/pantry-path";
import type { OddBit } from "~/lib/recipe-schema";

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
        const all = await listOutbox(pantryId);
        const active = all.find((entry) => entry.id === entryId) ?? null;
        const pending = all.filter((entry) => entry.status === "pending" && entry.id !== entryId);
        const decision = decideOutboxDrainStep(fetcher.data, entryId, pending[0] ?? null);

        if (decision.remove) {
          await removeOutboxEntry(decision.entryId);
          // Offline toggles on a queued add are stored on the add row; after the
          // server assigns a real id, enqueue the purchased toggle if needed.
          const oddBit =
            fetcher.data &&
            typeof fetcher.data === "object" &&
            "oddBit" in fetcher.data &&
            (fetcher.data as { oddBit?: OddBit }).oddBit;
          if (
            active?.fields.intent === "add-odd-bit" &&
            active.fields.purchased === "true" &&
            oddBit?.id
          ) {
            await enqueueOutbox({
              pantryId,
              actionPath: pantryPath(pantryId, "shopping"),
              fields: {
                intent: "toggle-odd-bit",
                id: oddBit.id,
                purchased: "true",
              },
            });
          }
        } else {
          await markOutboxFailed(decision.entryId, decision.failReason ?? "Sync failed.");
        }
        activeIdRef.current = null;

        const next =
          decision.remove && active?.fields.purchased === "true"
            ? await peekOutbox(pantryId)
            : decision.next;

        if (!next) {
          revalidator.revalidate();
          return;
        }
        activeIdRef.current = next.id;
        lastHandledRef.current = null;
        fetcher.submit(next.fields, {
          method: "post",
          action: next.actionPath,
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
