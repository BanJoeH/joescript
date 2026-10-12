import { useEffect, useRef, useState } from "react";

import { useOnlineStatus } from "~/lib/offline/connectivity";
import { useShoppingOutbox } from "~/lib/offline/use-shopping-outbox";
import { cn } from "~/lib/utils";

export function ShoppingOfflineBanner({ pantryId }: { pantryId: string }) {
  const online = useOnlineStatus();
  const { pending, failed } = useShoppingOutbox(pantryId);
  const wasOfflineRef = useRef(!online);
  const [syncingAfterReconnect, setSyncingAfterReconnect] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOfflineRef.current = true;
      setSyncingAfterReconnect(false);
      return;
    }
    if (wasOfflineRef.current && pending > 0) {
      setSyncingAfterReconnect(true);
    }
    wasOfflineRef.current = false;
  }, [online, pending]);

  useEffect(() => {
    if (pending === 0) setSyncingAfterReconnect(false);
  }, [pending]);

  const showReconnectSync = online && syncingAfterReconnect && pending > 0;

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
