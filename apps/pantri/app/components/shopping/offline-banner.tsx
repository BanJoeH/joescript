import { useEffect, useRef, useState } from "react";

import { useConnectivitySettled, useOnlineStatus } from "~/lib/offline/connectivity";
import { useShoppingOutbox } from "~/lib/offline/use-shopping-outbox";
import { cn } from "~/lib/utils";

export function ShoppingOfflineBanner({ pantryId }: { pantryId: string }) {
  const online = useOnlineStatus();
  const settled = useConnectivitySettled();
  const { pending, failed } = useShoppingOutbox(pantryId);
  const wasOfflineRef = useRef(false);
  const [syncingAfterReconnect, setSyncingAfterReconnect] = useState(false);

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
      {message}
    </div>
  );
}
