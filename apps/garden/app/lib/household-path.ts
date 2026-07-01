const RESERVED_PATH_SEGMENTS = new Set(["households", "login", "logout", "api"]);

export function householdPath(householdId: string, path = "") {
  const normalized = path.replace(/^\//, "");
  return normalized ? `/${householdId}/${normalized}` : `/${householdId}`;
}

export function photoPath(householdId: string, photoId: string) {
  return householdPath(householdId, `photos/${photoId}`);
}

export function getHouseholdIdFromPath(pathname: string) {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment || RESERVED_PATH_SEGMENTS.has(segment)) {
    return null;
  }
  return segment;
}
