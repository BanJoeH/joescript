const RESERVED_PATH_SEGMENTS = new Set(["pantries", "login", "logout", "api"]);

export function pantryPath(pantryId: string, path = "") {
  const normalized = path.replace(/^\//, "");
  return normalized ? `/${pantryId}/${normalized}` : `/${pantryId}`;
}

/** Home swiper tab index for `/:pantryId/shopping` vs `/:pantryId/recipes`. */
export function getHomeTabIndex(pathname: string, pantryId: string): 0 | 1 {
  return pathname === pantryPath(pantryId, "recipes") ? 1 : 0;
}

export function getPantryIdFromPath(pathname: string) {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment || RESERVED_PATH_SEGMENTS.has(segment)) {
    return null;
  }
  return segment;
}
