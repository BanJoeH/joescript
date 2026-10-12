type IdleHandle =
  | { kind: "idle"; id: number }
  | { kind: "timeout"; id: ReturnType<typeof setTimeout> };

let pending: IdleHandle | null = null;

function clearPending() {
  if (!pending) return;
  if (pending.kind === "idle" && typeof cancelIdleCallback === "function") {
    cancelIdleCallback(pending.id);
  } else if (pending.kind === "timeout") {
    clearTimeout(pending.id);
  }
  pending = null;
}

/**
 * Coalesce background work (e.g. loader revalidation after quiet drains).
 * Uses requestIdleCallback when available, with a timeout so it still runs.
 */
export function scheduleDeferredWork(work: () => void, options?: { timeoutMs?: number }) {
  const timeoutMs = options?.timeoutMs ?? 2000;
  clearPending();

  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(
      () => {
        pending = null;
        work();
      },
      { timeout: timeoutMs },
    );
    pending = { kind: "idle", id };
    return;
  }

  const id = setTimeout(
    () => {
      pending = null;
      work();
    },
    Math.min(500, timeoutMs),
  );
  pending = { kind: "timeout", id };
}

export function cancelDeferredWork() {
  clearPending();
}
