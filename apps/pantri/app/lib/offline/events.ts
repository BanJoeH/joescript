const CHANGE_EVENT = "pantri-shopping-offline-change";

export type ShoppingOfflineChangeDetail = {
  /** `transition` = server pull / non-urgent; default urgent for local mutations. */
  priority?: "urgent" | "transition";
};

/** Notify banner/drain listeners that snapshot or outbox changed. */
export function emitShoppingOfflineChange(detail?: ShoppingOfflineChangeDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ShoppingOfflineChangeDetail>(CHANGE_EVENT, {
      detail: { priority: detail?.priority ?? "urgent" },
    }),
  );
}

export function subscribeShoppingOfflineChange(
  listener: (detail: ShoppingOfflineChangeDetail) => void,
) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<ShoppingOfflineChangeDetail>;
    listener(custom.detail ?? { priority: "urgent" });
  };
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
