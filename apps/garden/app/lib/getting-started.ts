const STORAGE_PREFIX = "garden-getting-started-dismissed:";
const listeners = new Set<() => void>();

export function gettingStartedDismissKey(householdId: string) {
  return `${STORAGE_PREFIX}${householdId}`;
}

export function isGettingStartedDismissed(householdId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(gettingStartedDismissKey(householdId)) === "1";
}

export function dismissGettingStarted(householdId: string) {
  window.localStorage.setItem(gettingStartedDismissKey(householdId), "1");
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeGettingStartedDismiss(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
