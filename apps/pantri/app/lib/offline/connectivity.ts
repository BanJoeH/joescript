import { useEffect, useState, useSyncExternalStore } from "react";

export function getIsOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function subscribeOnline(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  // bfcache / tab resume often skips online/offline events.
  window.addEventListener("pageshow", onStoreChange);
  window.addEventListener("focus", onStoreChange);

  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
    window.removeEventListener("pageshow", onStoreChange);
    window.removeEventListener("focus", onStoreChange);
  };
}

/**
 * Browser online status. SSR/hydration default to online to match the server
 * HTML, then sync to `navigator.onLine` after mount (offline refresh never
 * fires an "offline" event, so the store must be re-read explicitly).
 */
export function useOnlineStatus() {
  const storeOnline = useSyncExternalStore(subscribeOnline, getIsOnline, () => true);
  const [didMount, setDidMount] = useState(false);

  useEffect(() => {
    setDidMount(true);
  }, []);

  if (!didMount) return true;
  return storeOnline;
}

export const SNAPSHOT_UPDATED_EVENT = "pantri:snapshot-updated";
export const OUTBOX_CHANGED_EVENT = "pantri:outbox-changed";

export function notifySnapshotUpdated(pantryId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SNAPSHOT_UPDATED_EVENT, { detail: { pantryId } }));
}

export type OutboxChangedDetail = {
  sent?: number;
  failed?: number;
};

export function notifyOutboxChanged(detail?: OutboxChangedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OUTBOX_CHANGED_EVENT, { detail }));
}

export function formatLastSynced(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
