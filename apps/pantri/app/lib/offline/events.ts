const CHANGE_EVENT = "pantri-shopping-offline-change";

/** Notify banner/drain listeners that snapshot or outbox changed. */
export function emitShoppingOfflineChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeShoppingOfflineChange(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}
