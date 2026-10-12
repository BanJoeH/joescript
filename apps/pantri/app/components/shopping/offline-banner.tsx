import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useConnectivitySettled, useOnlineStatus } from "~/lib/offline/connectivity";
import { outboxEntryLabel } from "~/lib/offline/outbox-entry-label";
import type { OutboxEntry } from "~/lib/offline/types";
import { useShoppingOutbox } from "~/lib/offline/use-shopping-outbox";
import { cn } from "~/lib/utils";

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
  const { entries, pending, failed } = useShoppingOutbox(pantryId);
  const wasOfflineRef = useRef(false);
  const [syncingAfterReconnect, setSyncingAfterReconnect] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const panelId = useId();

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
    if (pending === 0) setSyncingAfterReconnect(false);
  }, [pending]);

  const showReconnectSync = online && syncingAfterReconnect && pending > 0;

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

  const queueCount = entries.length;
  const queueSummary =
    queueCount === 0
      ? "Inspect queue"
      : `Queue (${queueCount}${failed > 0 ? ` · ${failed} failed` : ""})`;

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        failed > 0 && online
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-muted/60 text-muted-foreground",
      )}
      role="status"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1">{message}</p>
        <button
          aria-controls={panelId}
          aria-expanded={queueOpen}
          className="inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium text-foreground/80 hover:bg-background/50"
          onClick={() => setQueueOpen((open) => !open)}
          type="button"
        >
          {queueSummary}
          <ChevronDown
            aria-hidden
            className={cn("size-3.5 transition-transform", queueOpen && "rotate-180")}
          />
        </button>
      </div>
      {queueOpen ? (
        <div id={panelId}>
          <OutboxQueueInspector entries={entries} />
        </div>
      ) : null}
    </div>
  );
}
