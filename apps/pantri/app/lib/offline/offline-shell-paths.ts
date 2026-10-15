import { pantryPath } from "~/lib/pantry-path";

/**
 * Document shells the service worker may cache for offline hard-refresh.
 * Keep in sync with the path check in `public/sw.js`.
 */
export function isOfflineShellPath(pathname: string): boolean {
  if (/^\/[^/]+\/shopping(?:\/sorted)?\/?$/.test(pathname)) return true;
  if (/^\/[^/]+\/recipes\/?$/.test(pathname)) return true;
  // Recipe cook/detail — not new, import-photos, or :id/edit.
  const detail = pathname.match(/^\/[^/]+\/recipes\/([^/]+)\/?$/);
  if (!detail) return false;
  const segment = detail[1] ?? "";
  return segment !== "new" && segment !== "import-photos";
}

/** @deprecated Prefer `isOfflineShellPath`. */
export function isShoppingShellPath(pathname: string): boolean {
  return isOfflineShellPath(pathname);
}

/** Shell URLs to precache for a pantry (visited recipe details cache on navigate). */
export function offlineShellUrls(pantryId: string): string[] {
  return [
    pantryPath(pantryId, "shopping"),
    pantryPath(pantryId, "shopping/sorted"),
    pantryPath(pantryId, "recipes"),
  ];
}

/** @deprecated Prefer `offlineShellUrls`. */
export function shoppingShellUrls(pantryId: string): string[] {
  return offlineShellUrls(pantryId);
}
