import { pantryPath } from "~/lib/pantry-path";

/** Register the Pantri service worker (browser only). */
export function registerPantriServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

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

/**
 * Ask the service worker to cache document shells for offline cold opens.
 * Safe to call repeatedly; failures are ignored in the worker.
 */
export function prefetchPantryOfflineShells(
  pantryId: string,
  options?: { recipeIds?: string[] },
) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!navigator.onLine) return;

  const urls = [
    pantryPath(pantryId, "shopping"),
    pantryPath(pantryId, "recipes"),
    pantryPath(pantryId, "shopping/sorted"),
    ...(options?.recipeIds ?? []).map((recipeId) => pantryPath(pantryId, `recipes/${recipeId}`)),
  ];

  void navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({ type: "PRECACHE_SHELLS", urls });
    })
    .catch(() => {
      // SW not ready yet — next online visit will retry.
    });
}
