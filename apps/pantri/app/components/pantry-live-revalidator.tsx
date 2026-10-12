import { useEffect, useRef } from "react";
import { useRevalidator } from "react-router";

import { useNetworkOnline } from "~/lib/offline/connectivity";
import { pantryPath } from "~/lib/pantry-path";

/** Coalesce visibility + window focus from the same tab return. */
const FOCUS_REVALIDATE_COOLDOWN_MS = 750;

/** Always-on while debugging focus refetch; filter console by this prefix. */
const logFocus = (message: string, detail?: Record<string, unknown>) => {
  if (detail) {
    console.info(`[pantri:focus-revalidate] ${message}`, detail);
    return;
  }
  console.info(`[pantri:focus-revalidate] ${message}`);
};

/**
 * Keeps pantry loaders fresh while the tab is in use:
 * - SSE invalidate from other members
 * - refetch when reachability becomes online (probe settle / reconnect)
 * - refetch when returning to the tab (visibility) or window focus
 *
 * Mount once per pantry layout.
 */
export function PantryLiveRevalidator({ pantryId, userId }: { pantryId: string; userId: string }) {
  const revalidator = useRevalidator();
  const online = useNetworkOnline();
  const revalidatorRef = useRef(revalidator);
  const lastFocusRevalidateAt = useRef(0);
  revalidatorRef.current = revalidator;

  useEffect(() => {
    if (!online) return;

    const source = new EventSource(pantryPath(pantryId, "api/events"));

    const handleInvalidate = (event: Event) => {
      try {
        const message = event as MessageEvent<string>;
        const data = JSON.parse(message.data) as { actorId?: string | null };
        if (data.actorId && data.actorId === userId) {
          return;
        }
      } catch {
        // Ignore malformed payloads; still revalidate other clients.
      }

      revalidatorRef.current.revalidate();
    };

    source.addEventListener("pantry:invalidate", handleInvalidate);

    return () => {
      source.removeEventListener("pantry:invalidate", handleInvalidate);
      source.close();
    };
  }, [online, pantryId, userId]);

  useEffect(() => {
    if (!online) {
      logFocus("skip: offline");
      return;
    }

    const maybeRevalidate = (reason: string) => {
      const visibility = typeof document !== "undefined" ? document.visibilityState : "n/a";
      const state = revalidatorRef.current.state;
      const sinceLast = Date.now() - lastFocusRevalidateAt.current;

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        logFocus("skip: hidden", { reason, visibility, state });
        return;
      }
      if (state !== "idle") {
        logFocus("skip: revalidator busy", { reason, visibility, state });
        return;
      }
      if (sinceLast < FOCUS_REVALIDATE_COOLDOWN_MS) {
        logFocus("skip: cooldown", { reason, visibility, state, sinceLastMs: sinceLast });
        return;
      }

      lastFocusRevalidateAt.current = Date.now();
      logFocus("revalidate", { reason, visibility, state });
      void revalidatorRef.current.revalidate();
    };

    // Probe often settles *after* the focus/pageshow that woke us — refetch then,
    // and again whenever the tab becomes visible or the window is focused.
    logFocus("effect: online settled", { visibility: document.visibilityState });
    maybeRevalidate("online-settle");

    let wasHidden = document.visibilityState === "hidden";

    const onVisibility = () => {
      const hidden = document.visibilityState === "hidden";
      logFocus("visibilitychange", {
        wasHidden,
        now: document.visibilityState,
        willRevalidate: wasHidden && !hidden,
      });
      if (wasHidden && !hidden) maybeRevalidate("visibility-visible");
      wasHidden = hidden;
    };

    const onFocus = () => {
      logFocus("window focus", { visibility: document.visibilityState });
      maybeRevalidate("window-focus");
    };

    const onPageShow = (event: PageTransitionEvent) => {
      // bfcache restore or normal pageshow while visible
      const willRevalidate = event.persisted || document.visibilityState === "visible";
      logFocus("pageshow", {
        persisted: event.persisted,
        visibility: document.visibilityState,
        willRevalidate,
      });
      if (willRevalidate) maybeRevalidate("pageshow");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      logFocus("effect: cleanup");
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [online]);

  return null;
}
