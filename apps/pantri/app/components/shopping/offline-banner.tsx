import { type MouseEvent, useEffect, useRef, useState } from "react";

import {
  probeOnlineStatus,
  useConnectivitySettled,
  useOnlineStatus,
} from "~/lib/offline/connectivity";
import { requestShoppingOutboxSync } from "~/lib/offline/events";
import { retryFailedOutbox } from "~/lib/offline/outbox";
import { outboxEntryLabel } from "~/lib/offline/outbox-entry-label";
import type { OutboxEntry } from "~/lib/offline/types";
import { useShoppingOutbox } from "~/lib/offline/use-shopping-outbox";
import { cn } from "~/lib/utils";

const DEBUG_OUTBOX_KEY = "pantri.debugOutbox";

function readDebugOutboxFlag() {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("debugOutbox")) return true;
    return window.localStorage.getItem(DEBUG_OUTBOX_KEY) === "1";
  } catch {
    return false;
  }
}

function OutboxQueueInspector({ entries }: { entries: OutboxEntry[] }) {
  if (entries.length === 0) {
    return <p className="mt-2 text-xs text-muted-foreground/80">Drain queue is empty.</p>;
  }

  return (
    <ol className="mt-2 max-h-48 space-y-1.5 overflow-y-auto text-xs">
      {entries.map((entry, index) => (
        <li
          className={cn(
            "rounded border px-2 py-1.5",
            entry.status === "failed"
              ? "border-destructive/30 bg-destructive/5"
              : "border-border/60 bg-background/40",
          )}
          key={entry.id}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium text-foreground/90">
              {index + 1}. {outboxEntryLabel(entry)}
            </span>
            <span
              className={cn(
                "shrink-0 uppercase tracking-wide",
                entry.status === "failed" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {entry.status}
            </span>
          </div>
          {entry.lastError ? <p className="mt-0.5 text-destructive/90">{entry.lastError}</p> : null}
          <p className="mt-0.5 truncate font-mono text-[0.65rem] text-muted-foreground/70">
            {entry.fields.intent ?? "?"} · {entry.id.slice(0, 14)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function ShoppingOfflineBanner({ pantryId }: { pantryId: string }) {
  const online = useOnlineStatus();
  const settled = useConnectivitySettled();
  const { entries, pending, failed, refresh } = useShoppingOutbox(pantryId);
  const wasOfflineRef = useRef(false);
  const clickTimesRef = useRef<number[]>([]);
  const [syncingAfterReconnect, setSyncingAfterReconnect] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);

  useEffect(() => {
    setDebugOpen(readDebugOutboxFlag());
  }, []);

  useEffect(() => {
    if (!settled) return;
    if (!online) {
      wasOfflineRef.current = true;
      setSyncingAfterReconnect(false);
      return;
    }
    if (wasOfflineRef.current && pending > 0) {
      setSyncingAfterReconnect(true);
    }
    wasOfflineRef.current = false;
  }, [settled, online, pending]);

  useEffect(() => {
    if (pending === 0 && failed === 0) setSyncingAfterReconnect(false);
  }, [pending, failed]);

  const showReconnectSync = online && syncingAfterReconnect && pending > 0;
  const hasQueuedWork = pending > 0 || failed > 0;

  // Avoid a false "online" banner state before the boot probe finishes.
  if (!settled) return null;
  if (online && failed === 0 && !showReconnectSync) return null;

  let message = "Offline — changes will sync when you reconnect.";
  if (online && failed > 0) {
    message = `${failed} shopping change${failed === 1 ? "" : "s"} failed to sync.`;
  } else if (showReconnectSync) {
    message = `Syncing ${pending} shopping change${pending === 1 ? "" : "s"}…`;
  } else if (!online && pending > 0) {
    message = `Offline — ${pending} change${pending === 1 ? "" : "s"} will sync when you reconnect.`;
  }

  const onBannerClick = () => {
    const now = Date.now();
    const recent = clickTimesRef.current.filter((time) => now - time < 800);
    recent.push(now);
    clickTimesRef.current = recent;
    if (recent.length < 3) return;

    clickTimesRef.current = [];
    setDebugOpen((open) => {
      const next = !open;
      try {
        if (next) window.localStorage.setItem(DEBUG_OUTBOX_KEY, "1");
        else window.localStorage.removeItem(DEBUG_OUTBOX_KEY);
      } catch {
        // ignore quota / private mode
      }
      return next;
    });
  };

  const onTrySync = async (event: MouseEvent) => {
    event.stopPropagation();
    if (syncBusy) return;
    setSyncBusy(true);
    try {
      await retryFailedOutbox(pantryId);
      await refresh();
      const reachable = await probeOnlineStatus();
      if (!reachable) return;
      setSyncingAfterReconnect(true);
      requestShoppingOutboxSync();
    } finally {
      setSyncBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        failed > 0 && online
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-muted/60 text-muted-foreground",
      )}
      onClick={onBannerClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onBannerClick();
      }}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1">{message}</p>
        {hasQueuedWork ? (
          <button
            className="shrink-0 rounded-md border border-border/80 bg-background/70 px-2 py-1 text-xs font-medium text-foreground hover:bg-background disabled:opacity-60"
            disabled={syncBusy}
            onClick={onTrySync}
            type="button"
          >
            {syncBusy ? "Trying…" : "Try syncing now"}
          </button>
        ) : null}
      </div>
      {debugOpen ? <OutboxQueueInspector entries={entries} /> : null}
    </div>
  );
}
