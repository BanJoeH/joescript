import { useEffect, useState } from "react";
import { useParams } from "react-router";

import {
  formatLastSynced,
  OUTBOX_CHANGED_EVENT,
  SNAPSHOT_UPDATED_EVENT,
  useOnlineStatus,
} from "~/lib/offline/connectivity";
import { listOutbox } from "~/lib/offline/outbox";
import { getHomeSnapshotMeta } from "~/lib/offline/snapshot";
import { cn } from "~/lib/utils";

type OutboxSummary = {
  pending: number;
  failed: number;
};

export function OfflineBanner({ className }: { className?: string }) {
  const online = useOnlineStatus();
  const params = useParams();
  const pantryId = params.pantryId;
  const [summary, setSummary] = useState<OutboxSummary>({ pending: 0, failed: 0 });
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    if (!pantryId) return;

    let cancelled = false;

    async function refresh() {
      if (!pantryId) return;
      const [entries, meta] = await Promise.all([
        listOutbox(pantryId),
        getHomeSnapshotMeta(pantryId),
      ]);
      if (cancelled) return;
      setSummary({
        pending: entries.length,
        failed: entries.filter((entry) => entry.attempts > 0 || Boolean(entry.lastError)).length,
      });
      setLastSynced(formatLastSynced(meta?.fetchedAt));
    }

    void refresh();

    const onChange = () => {
      void refresh();
    };

    window.addEventListener(OUTBOX_CHANGED_EVENT, onChange);
    window.addEventListener(SNAPSHOT_UPDATED_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(OUTBOX_CHANGED_EVENT, onChange);
      window.removeEventListener(SNAPSHOT_UPDATED_EVENT, onChange);
    };
  }, [pantryId]);

  const { pending, failed } = summary;
  if (online && pending === 0) return null;

  const syncedLabel = lastSynced ? `last updated ${lastSynced}` : "no local copy yet";
  let message: string;
  if (!online) {
    message = `Offline · ${syncedLabel}${pending > 0 ? ` · ${pending} pending` : ""}`;
  } else if (failed > 0) {
    message =
      failed === pending
        ? `Couldn't sync ${failed} change${failed === 1 ? "" : "s"} — will keep trying`
        : `Syncing ${pending} change${pending === 1 ? "" : "s"} · ${failed} need${failed === 1 ? "s" : ""} another try`;
  } else {
    message = `Syncing ${pending} change${pending === 1 ? "" : "s"}…`;
  }

  return (
    <div
      className={cn(
        "border-b px-3 py-1.5 text-center text-xs font-medium",
        online && failed > 0
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : online
            ? "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100"
            : "border-border bg-muted text-muted-foreground",
        className,
      )}
      role="status"
    >
      {message}
    </div>
  );
}
