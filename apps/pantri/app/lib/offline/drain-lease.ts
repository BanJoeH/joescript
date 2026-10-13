import { DRAIN_LEASE_STORE, openShoppingOfflineDb } from "~/lib/offline/db";

/** How long another tab waits before stealing a stuck lease. */
export const DRAIN_LEASE_TTL_MS = 15_000;

export type DrainLease = {
  pantryId: string;
  ownerId: string;
  entryId: string;
  expiresAt: number;
};

let ownerIdMemo: string | null = null;

/** Stable per tab/session so remounts in the same tab keep the lease. */
export function getDrainOwnerId() {
  if (ownerIdMemo) return ownerIdMemo;
  try {
    const key = "pantri-drain-owner";
    const existing = sessionStorage.getItem(key);
    if (existing) {
      ownerIdMemo = existing;
      return existing;
    }
    const created = crypto.randomUUID();
    sessionStorage.setItem(key, created);
    ownerIdMemo = created;
    return created;
  } catch {
    ownerIdMemo = crypto.randomUUID();
    return ownerIdMemo;
  }
}

export function resetDrainOwnerIdForTests() {
  ownerIdMemo = null;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

/**
 * Acquire or renew the drain lease for this pantry (atomic read+write).
 * Returns false when another tab still holds a non-expired lease.
 */
export async function tryAcquireDrainLease(
  pantryId: string,
  entryId: string,
  ownerId: string = getDrainOwnerId(),
  now: number = Date.now(),
): Promise<boolean> {
  try {
    const db = await openShoppingOfflineDb();
    const tx = db.transaction(DRAIN_LEASE_STORE, "readwrite");
    const store = tx.objectStore(DRAIN_LEASE_STORE);
    const current = await requestToPromise(
      store.get(pantryId) as IDBRequest<DrainLease | undefined>,
    );

    if (current && current.expiresAt > now && current.ownerId !== ownerId) {
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("lease tx failed"));
        tx.onabort = () => reject(tx.error ?? new Error("lease tx aborted"));
      });
      return false;
    }

    const lease: DrainLease = {
      pantryId,
      ownerId,
      entryId,
      expiresAt: now + DRAIN_LEASE_TTL_MS,
    };
    store.put(lease);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("lease tx failed"));
      tx.onabort = () => reject(tx.error ?? new Error("lease tx aborted"));
    });
    return true;
  } catch {
    // IDB unavailable — allow drain (single-tab / private mode quirks).
    return true;
  }
}

export async function releaseDrainLease(
  pantryId: string,
  ownerId: string = getDrainOwnerId(),
): Promise<void> {
  try {
    const db = await openShoppingOfflineDb();
    const tx = db.transaction(DRAIN_LEASE_STORE, "readwrite");
    const store = tx.objectStore(DRAIN_LEASE_STORE);
    const current = await requestToPromise(
      store.get(pantryId) as IDBRequest<DrainLease | undefined>,
    );
    if (current && current.ownerId !== ownerId) {
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("lease tx failed"));
        tx.onabort = () => reject(tx.error ?? new Error("lease tx aborted"));
      });
      return;
    }
    store.delete(pantryId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("lease tx failed"));
      tx.onabort = () => reject(tx.error ?? new Error("lease tx aborted"));
    });
  } catch {
    // ignore
  }
}
