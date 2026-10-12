import { pantryPath } from "~/lib/pantry-path";

/**
 * Document shells the service worker may cache for offline hard-refresh.
 * Keep in sync with the path check in `public/sw.js`.
 */
export function isShoppingShellPath(pathname: string): boolean {
  return /^\/[^/]+\/shopping(?:\/sorted)?\/?$/.test(pathname);
}

/** Shopping + sorted URLs for a pantry (for SW precache messages). */
export function shoppingShellUrls(pantryId: string): string[] {
  return [pantryPath(pantryId, "shopping"), pantryPath(pantryId, "shopping/sorted")];
}
