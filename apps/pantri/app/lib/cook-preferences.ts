import { useCallback, useSyncExternalStore } from "react";

export const COOK_TEXT_SIZE_KEY = "pantri.cookTextSize";

export const COOK_TEXT_SIZES = [0, 1, 2] as const;
export type CookTextSize = (typeof COOK_TEXT_SIZES)[number];

export const COOK_STEP_TEXT_CLASS: Record<CookTextSize, string> = {
  0: "text-lg",
  1: "text-xl",
  2: "text-2xl",
};

export const COOK_INGREDIENT_TEXT_CLASS: Record<CookTextSize, string> = {
  0: "text-base",
  1: "text-lg",
  2: "text-xl",
};

const listeners = new Set<() => void>();

function emitCookTextSizeChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function isCookTextSize(value: unknown): value is CookTextSize {
  return value === 0 || value === 1 || value === 2;
}

export function readCookTextSize(): CookTextSize {
  try {
    const raw = localStorage.getItem(COOK_TEXT_SIZE_KEY);
    if (raw === null) return 0;
    const parsed = Number(raw);
    return isCookTextSize(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function writeCookTextSize(size: CookTextSize) {
  try {
    localStorage.setItem(COOK_TEXT_SIZE_KEY, String(size));
  } catch {
    // Ignore quota / private mode failures.
  }
  emitCookTextSizeChange();
}

export function nextCookTextSize(size: CookTextSize): CookTextSize {
  const currentIndex = COOK_TEXT_SIZES.indexOf(size);
  const nextIndex = (currentIndex + 1) % COOK_TEXT_SIZES.length;
  return COOK_TEXT_SIZES[nextIndex] ?? 0;
}

export function subscribeCookTextSize(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  function onStorage(event: StorageEvent) {
    if (event.key === COOK_TEXT_SIZE_KEY || event.key === null) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCookTextSize() {
  const textSize = useSyncExternalStore(
    subscribeCookTextSize,
    readCookTextSize,
    (): CookTextSize => 0,
  );

  const cycleTextSize = useCallback(() => {
    writeCookTextSize(nextCookTextSize(textSize));
  }, [textSize]);

  return { textSize, cycleTextSize };
}
