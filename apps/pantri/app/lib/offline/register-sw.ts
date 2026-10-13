import { canUseNetwork } from "~/lib/offline/connectivity";
import { shoppingShellUrls } from "~/lib/offline/shopping-shell-paths";

/** Register the Pantri service worker (production browser only). */
export function registerPantriServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;

  const register = () => {
    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[pantri] service worker registration failed", error);
    });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}

/** Same-origin hashed assets the current page already loaded (CSS/JS). */
function collectLoadedAssetUrls(): string[] {
  const urls = new Set<string>();

  const add = (raw: string | null | undefined) => {
    if (!raw) return;
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin !== window.location.origin) return;
      if (!url.pathname.startsWith("/assets/")) return;
      urls.add(url.pathname + url.search);
    } catch {
      // ignore
    }
  };

  for (const el of document.querySelectorAll("link[href], script[src]")) {
    add(el.getAttribute("href") ?? el.getAttribute("src"));
  }

  for (const entry of performance.getEntriesByType("resource")) {
    add(entry.name);
  }

  return [...urls];
}

function postToActiveWorker(message: { type: string; urls: string[] }) {
  void navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage(message);
    })
    .catch(() => {
      // SW not ready yet — next online visit will retry.
    });
}

/**
 * Ask the SW to cache shopping + sorted document shells (and their /assets/*)
 * for offline cold opens. Safe to call repeatedly.
 */
export function prefetchShoppingOfflineShells(pantryId: string) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!canUseNetwork()) return;

  postToActiveWorker({ type: "PRECACHE_SHELLS", urls: shoppingShellUrls(pantryId) });
  postToActiveWorker({ type: "PRECACHE_ASSETS", urls: collectLoadedAssetUrls() });
}
