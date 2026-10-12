const DB_NAME = "pantri-shopping-offline";
const DB_VERSION = 3;

export const SNAPSHOT_STORE = "snapshots";
export const OUTBOX_STORE = "outbox";
export const LAYOUT_STORE = "layouts";
export const DRAIN_LEASE_STORE = "drain-leases";

let dbPromise: Promise<IDBDatabase> | null = null;

export function openShoppingOfflineDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          db.createObjectStore(SNAPSHOT_STORE, { keyPath: "pantryId" });
        }
        if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
          const store = db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
          store.createIndex("byPantryCreated", ["pantryId", "createdAt"], { unique: false });
        }
        if (!db.objectStoreNames.contains(LAYOUT_STORE)) {
          db.createObjectStore(LAYOUT_STORE, { keyPath: "pantryId" });
        }
        if (!db.objectStoreNames.contains(DRAIN_LEASE_STORE)) {
          db.createObjectStore(DRAIN_LEASE_STORE, { keyPath: "pantryId" });
        }
      };
    });
  }
  return dbPromise;
}

/** Reset the cached DB handle (tests only). */
export async function resetShoppingOfflineDbForTests() {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // ignore
    }
  }
  dbPromise = null;
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to delete test DB."));
    request.onblocked = () => resolve();
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

export async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openShoppingOfflineDb();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  const resultPromise = requestToPromise(run(store));
  const txPromise = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed."));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted."));
  });
  const [result] = await Promise.all([resultPromise, txPromise]);
  return result;
}

export function newOutboxId() {
  return `obx_${crypto.randomUUID()}`;
}
