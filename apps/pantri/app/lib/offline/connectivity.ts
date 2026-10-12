import { useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();

/** Effective connectivity — `navigator.onLine` refined by a real network probe. */
let effectiveOnline = true;
let probeInFlight: Promise<void> | null = null;
let monitoringStarted = false;
/** Only while offline — catches reconnect when `online` never fires (SW Offline toggle). */
let offlinePollId: ReturnType<typeof setInterval> | null = null;

const OFFLINE_POLL_MS = 10_000;

export function getIsOnline() {
  return effectiveOnline;
}

/** @deprecated Prefer `getIsOnline` — kept as an alias for call sites. */
export function isBrowserOnline() {
  return getIsOnline();
}

function emit() {
  for (const listener of listeners) listener();
}

function stopOfflinePoll() {
  if (offlinePollId == null) return;
  clearInterval(offlinePollId);
  offlinePollId = null;
}

function startOfflinePoll() {
  if (offlinePollId != null) return;
  offlinePollId = setInterval(() => {
    void probeOnlineStatus();
  }, OFFLINE_POLL_MS);
}

function setEffectiveOnline(next: boolean) {
  if (effectiveOnline === next) {
    // Still ensure poll matches state (e.g. first probe confirms offline).
    if (next) stopOfflinePoll();
    else startOfflinePoll();
    return;
  }
  effectiveOnline = next;
  if (next) stopOfflinePoll();
  else startOfflinePoll();
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
 * while fetches fail — which hid the banner and ran outbox drain / revalidate.
 */
export async function probeOnlineStatus() {
  // SSR / non-browser: keep last known. Vitest provides `fetch` without a DOM.
  if (typeof fetch !== "function") return effectiveOnline;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setEffectiveOnline(false);
    return false;
  }

  if (!probeInFlight) {
    probeInFlight = (async () => {
      try {
        // Path is intentionally unhandled by the SW so this hits the network.
        // Any HTTP response (including 404) means we reached the origin.
        await fetch(`/_pantri_online_probe?t=${Date.now()}`, {
          method: "GET",
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
  if (typeof window === "undefined" || monitoringStarted) return;
  monitoringStarted = true;

  effectiveOnline = navigator.onLine;

  const sync = () => {
    void probeOnlineStatus();
  };

  window.addEventListener("online", sync);
  window.addEventListener("offline", () => setEffectiveOnline(false));
  window.addEventListener("pageshow", sync);
  window.addEventListener("focus", sync);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") sync();
  });
  // Immediate probe on boot (offline hard-refresh / SW Offline with onLine===true).
  sync();
}

// Vitest imports this module widely — don't start timers/probes during unit tests.
if (!import.meta.env.VITEST) {
  startConnectivityMonitoring();
}

/**
 * Browser online status for UI. SSR defaults to online; the client probe updates
 * immediately after mount (including offline refresh with no "offline" event).
 */
export function useOnlineStatus() {
  // Ensure monitoring is on when a React tree mounts (covers test environments too).
  if (typeof window !== "undefined") startConnectivityMonitoring();
  return useSyncExternalStore(subscribeOnline, getIsOnline, () => true);
}

/** Test helper — reset probe state between cases. */
export function resetConnectivityForTests(online = true) {
  stopOfflinePoll();
  effectiveOnline = online;
  probeInFlight = null;
}
