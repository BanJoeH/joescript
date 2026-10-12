import { useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();
/** Tab/window resume — focus, visibility visible, pageshow. Module-level so React effects can't drop it. */
const resumeListeners = new Set<Listener>();

/** Effective connectivity — `navigator.onLine` refined by a real network probe. */
let effectiveOnline = true;
/** False until the first probe (or offline event) settles — gates drain/SSE/revalidate. */
let connectivitySettled = false;
let probeInFlight: Promise<void> | null = null;
let monitoringStarted = false;
/** Only while offline — catches reconnect when `online` never fires (SW Offline toggle). */
let offlinePollId: ReturnType<typeof setInterval> | null = null;

const OFFLINE_POLL_MS = 10_000;
/** Background tabs pause rAF; a gap this large means the tab was frozen and just woke. */
const RAF_RESUME_GAP_MS = 1_500;

const logConnectivity = (message: string, detail?: Record<string, unknown>) => {
  if (detail) {
    console.info(`[pantri:connectivity] ${message}`, detail);
    return;
  }
  console.info(`[pantri:connectivity] ${message}`);
};

export function getIsOnline() {
  return effectiveOnline;
}

export function hasConnectivitySettled() {
  return connectivitySettled;
}

/** Safe for outbox drain / SSE / focus revalidate — false until the first probe finishes. */
export function canUseNetwork() {
  return connectivitySettled && effectiveOnline;
}

/** @deprecated Prefer `getIsOnline` — kept as an alias for call sites. */
export function isBrowserOnline() {
  return getIsOnline();
}

function emit() {
  for (const listener of listeners) listener();
}

function markSettled() {
  if (connectivitySettled) return;
  connectivitySettled = true;
  emit();
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
    markSettled();
    return;
  }
  effectiveOnline = next;
  if (next) stopOfflinePoll();
  else startOfflinePoll();
  markSettled();
  emit();
}

function subscribeOnline(onStoreChange: Listener) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function emitResume(reason: string) {
  logConnectivity(`resume:${reason}`, {
    visibility: document.visibilityState,
    hasFocus: document.hasFocus(),
    canUseNetwork: connectivitySettled && effectiveOnline,
    listeners: resumeListeners.size,
  });
  for (const listener of resumeListeners) listener();
}

/**
 * Fires when the tab becomes visible, the window is focused, or pageshow runs.
 * Listeners are registered on `window`/`document` once for the page lifetime.
 */
export function subscribeWindowResume(onResume: Listener) {
  if (typeof window !== "undefined") startConnectivityMonitoring();
  resumeListeners.add(onResume);
  return () => {
    resumeListeners.delete(onResume);
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

  // Do not trust navigator.onLine for "can use network" until the probe settles.
  // Keep effectiveOnline as a soft hint for the banner after settle only.
  effectiveOnline = navigator.onLine;
  connectivitySettled = false;

  const sync = () => {
    void probeOnlineStatus();
  };

  window.addEventListener("online", sync);
  window.addEventListener("offline", () => setEffectiveOnline(false));
  window.addEventListener("pageshow", (event) => {
    logConnectivity("pageshow", { persisted: event.persisted });
    sync();
    emitResume("pageshow");
  });
  // Tab switches in the same window do not fire window focus — only visibilitychange.
  window.addEventListener(
    "focus",
    () => {
      logConnectivity("window focus");
      sync();
      emitResume("focus");
    },
    true,
  );
  window.addEventListener(
    "blur",
    () => {
      logConnectivity("window blur");
    },
    true,
  );
  const onVisibility = () => {
    logConnectivity("visibilitychange", { visibility: document.visibilityState });
    if (document.visibilityState === "visible") {
      sync();
      emitResume("visibility");
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  // Some embeds only surface the event on window.
  window.addEventListener("visibilitychange", onVisibility);

  // Page Lifecycle (Chromium) — fires when a tab is frozen / resumed.
  document.addEventListener("freeze", () => {
    logConnectivity("freeze");
  });
  document.addEventListener("resume", () => {
    logConnectivity("resume event");
    sync();
    emitResume("lifecycle-resume");
  });

  // Fallback: background tabs pause requestAnimationFrame. When we wake, the
  // frame-time gap is large even if visibilitychange was swallowed (webview /
  // odd Chrome focus setups). `__pantriPingResume` already proved the
  // subscribe→revalidate path works without these browser events.
  let lastFrameAt = 0;
  const onFrame = (now: number) => {
    if (lastFrameAt > 0 && now - lastFrameAt > RAF_RESUME_GAP_MS) {
      logConnectivity("rAF gap resume", { gapMs: Math.round(now - lastFrameAt) });
      sync();
      emitResume("rAF-gap");
    }
    lastFrameAt = now;
    requestAnimationFrame(onFrame);
  };
  requestAnimationFrame(onFrame);

  // Console helper: run `__pantriPingResume()` to prove the revalidate subscribe path.
  (window as Window & { __pantriPingResume?: () => void }).__pantriPingResume = () =>
    emitResume("manual");

  logConnectivity("monitoring started", {
    visibility: document.visibilityState,
    onLine: navigator.onLine,
  });

  // Immediate probe on boot (offline hard-refresh / SW Offline with onLine===true).
  sync();
}

// Vitest imports this module widely — don't start timers/probes during unit tests.
if (!import.meta.env.VITEST) {
  startConnectivityMonitoring();
}

/**
 * Reachability for UI. SSR defaults to online; after mount the probe settles
 * (including offline refresh where navigator.onLine lies).
 */
export function useOnlineStatus() {
  if (typeof window !== "undefined") startConnectivityMonitoring();
  return useSyncExternalStore(subscribeOnline, getIsOnline, () => true);
}

export function useConnectivitySettled() {
  if (typeof window !== "undefined") startConnectivityMonitoring();
  return useSyncExternalStore(subscribeOnline, hasConnectivitySettled, () => false);
}

/** Drain / SSE / focus-revalidate: only true after the first probe says we're online. */
export function useNetworkOnline() {
  if (typeof window !== "undefined") startConnectivityMonitoring();
  return useSyncExternalStore(subscribeOnline, canUseNetwork, () => false);
}

/** Test helper — reset probe state between cases. */
export function resetConnectivityForTests(online = true) {
  stopOfflinePoll();
  effectiveOnline = online;
  connectivitySettled = true;
  probeInFlight = null;
}
