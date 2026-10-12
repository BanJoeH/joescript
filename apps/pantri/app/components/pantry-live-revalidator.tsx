import { type MutableRefObject, type RefObject, useEffect, useRef } from "react";
import { useRevalidator } from "react-router";

import { canUseNetwork, useNetworkOnline } from "~/lib/offline/connectivity";
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

  // Probe settle / reconnect — independent of focus listeners so those stay mounted.
  useEffect(() => {
    if (!online) {
      logFocus("skip: offline (canUseNetwork false until probe settles)", {
        canUseNetwork: canUseNetwork(),
      });
      return;
    }

    logFocus("effect: online settled", { visibility: document.visibilityState });
    maybeRevalidateFromRef(revalidatorRef, lastFocusRevalidateAt, "online-settle");
  }, [online]);

  // Focus / visibility listeners mount once — do not tear down when online flips.
  useEffect(() => {
    let wasHidden = document.visibilityState === "hidden";
    logFocus("effect: focus listeners attached", { visibility: document.visibilityState });

    const onVisibility = () => {
      const hidden = document.visibilityState === "hidden";
      logFocus("visibilitychange", {
        wasHidden,
        now: document.visibilityState,
        canUseNetwork: canUseNetwork(),
        willRevalidate: wasHidden && !hidden && canUseNetwork(),
      });
      if (wasHidden && !hidden) {
        maybeRevalidateFromRef(revalidatorRef, lastFocusRevalidateAt, "visibility-visible");
      }
      wasHidden = hidden;
    };

    const onFocus = () => {
      logFocus("window focus", {
        visibility: document.visibilityState,
        canUseNetwork: canUseNetwork(),
      });
      maybeRevalidateFromRef(revalidatorRef, lastFocusRevalidateAt, "window-focus");
    };

    const onPageShow = (event: PageTransitionEvent) => {
      const willRevalidate = event.persisted || document.visibilityState === "visible";
      logFocus("pageshow", {
        persisted: event.persisted,
        visibility: document.visibilityState,
        canUseNetwork: canUseNetwork(),
        willRevalidate,
      });
      if (willRevalidate) {
        maybeRevalidateFromRef(revalidatorRef, lastFocusRevalidateAt, "pageshow");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      logFocus("effect: focus listeners cleanup");
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}

function maybeRevalidateFromRef(
  revalidatorRef: RefObject<{ state: string; revalidate: () => void }>,
  lastFocusRevalidateAt: MutableRefObject<number>,
  reason: string,
) {
  const visibility = typeof document !== "undefined" ? document.visibilityState : "n/a";
  const networkOk = canUseNetwork();
  const state = revalidatorRef.current?.state ?? "n/a";
  const sinceLast = Date.now() - lastFocusRevalidateAt.current;

  if (!networkOk) {
    logFocus("skip: canUseNetwork false", { reason, visibility, state });
    return;
  }
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
  void revalidatorRef.current?.revalidate();
}
