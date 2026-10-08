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

let lastShellPantryId: string | null = null;
const postedRecipeIds = new Set<string>();
let idleRecipeHandle: number | null = null;

function postPrecacheUrls(urls: string[]) {
  if (urls.length === 0) return;
  void navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({ type: "PRECACHE_SHELLS", urls });
    })
    .catch(() => {
      // SW not ready yet — next online visit will retry.
    });
}

function scheduleIdle(work: () => void) {
  if (typeof window === "undefined") return;
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(() => work(), { timeout: 5_000 });
  }
  return window.setTimeout(work, 250) as unknown as number;
}

function cancelIdle(handle: number | null) {
  if (handle == null || typeof window === "undefined") return;
  if (typeof window.cancelIdleCallback === "function") {
    window.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
}

/**
 * Ask the service worker to cache document shells for offline cold opens.
 * Shells (shopping/recipes/sorted) go immediately; recipe detail HTML is idle +
 * only for IDs not already queued this session (SW also skips cache hits).
 */
export function prefetchPantryOfflineShells(pantryId: string, options?: { recipeIds?: string[] }) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!navigator.onLine) return;

  if (lastShellPantryId !== pantryId) {
    lastShellPantryId = pantryId;
    postedRecipeIds.clear();
    cancelIdle(idleRecipeHandle);
    idleRecipeHandle = null;
  }

  const shellUrls = [
    pantryPath(pantryId, "shopping"),
    pantryPath(pantryId, "recipes"),
    pantryPath(pantryId, "shopping/sorted"),
  ];
  postPrecacheUrls(shellUrls);

  const recipeIds = options?.recipeIds ?? [];
  if (recipeIds.length === 0) return;

  const newIds = recipeIds.filter((id) => !postedRecipeIds.has(id));
  if (newIds.length === 0) return;
  for (const id of newIds) postedRecipeIds.add(id);

  cancelIdle(idleRecipeHandle);
  idleRecipeHandle = scheduleIdle(() => {
    idleRecipeHandle = null;
    postPrecacheUrls(newIds.map((recipeId) => pantryPath(pantryId, `recipes/${recipeId}`)));
  }) as number;
}
