import { useSyncExternalStore } from "react";

export function getIsOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function subscribeOnline(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, getIsOnline, () => true);
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
