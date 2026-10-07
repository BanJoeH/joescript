import { useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();

/** Effective connectivity — `navigator.onLine` refined by a real network probe. */
let effectiveOnline = true;
let probeInFlight: Promise<void> | null = null;

export function getIsOnline() {
  return effectiveOnline;
}

function emit() {
  for (const listener of listeners) listener();
}

function setEffectiveOnline(next: boolean) {
  if (effectiveOnline === next) return;
  effectiveOnline = next;
  emit();
}

function subscribeOnline(onStoreChange: Listener) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/**
 * Confirm reachability. Needed because Chrome's Application → Service worker →
 * Offline checkbox (and some lie-fi cases) leave `navigator.onLine === true`
 * while fetches fail — which hid the banner and sent mutations through fetcher.
 */
export async function probeOnlineStatus() {
  if (typeof window === "undefined") return effectiveOnline;

  if (!navigator.onLine) {
    setEffectiveOnline(false);
    return false;
  }

  if (!probeInFlight) {
    probeInFlight = (async () => {
      try {
        // Path is intentionally unhandled by the SW so this hits the network.
        await fetch(`/_pantri_online_probe?t=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
        });
        setEffectiveOnline(true);
      } catch {
        setEffectiveOnline(false);
      } finally {
        probeInFlight = null;
      }
    })();
  }

  await probeInFlight;
  return effectiveOnline;
}

function startConnectivityMonitoring() {
  if (typeof window === "undefined") return;

  effectiveOnline = navigator.onLine;

  const sync = () => {
    void probeOnlineStatus();
  };

  window.addEventListener("online", sync);
  window.addEventListener("offline", () => setEffectiveOnline(false));
  window.addEventListener("pageshow", sync);
  window.addEventListener("focus", sync);
  // Catch SW-offline / lie-fi soon after boot and periodically while open.
  sync();
  window.setInterval(sync, 10_000);
}

startConnectivityMonitoring();

/**
 * Browser online status for UI. SSR defaults to online; the client probe updates
 * immediately after mount (including offline refresh with no "offline" event).
 */
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
