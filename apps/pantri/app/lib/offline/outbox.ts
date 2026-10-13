import { newOutboxId, OUTBOX_STORE, withStore } from "~/lib/offline/db";
import { emitShoppingOfflineChange } from "~/lib/offline/events";
import type { OutboxEntry } from "~/lib/offline/types";

let lastCreatedAt = 0;

function nextCreatedAt() {
  const now = Date.now();
  lastCreatedAt = now <= lastCreatedAt ? lastCreatedAt + 1 : now;
  return lastCreatedAt;
}

export async function listOutbox(pantryId: string): Promise<OutboxEntry[]> {
  try {
    const all = await withStore<OutboxEntry[]>(OUTBOX_STORE, "readonly", (store) => store.getAll());
    return all
      .filter((entry) => entry.pantryId === pantryId)
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

export async function enqueueOutbox(input: {
  pantryId: string;
  actionPath: string;
  fields: Record<string, string>;
}): Promise<OutboxEntry> {
  const entry: OutboxEntry = {
    id: newOutboxId(),
    pantryId: input.pantryId,
    createdAt: nextCreatedAt(),
    actionPath: input.actionPath,
    fields: input.fields,
    status: "pending",
  };
  await withStore(OUTBOX_STORE, "readwrite", (store) => store.put(entry));
  emitShoppingOfflineChange();
  return entry;
}

export async function removeOutboxEntry(id: string, options?: { emit?: boolean }): Promise<void> {
  await withStore(OUTBOX_STORE, "readwrite", (store) => store.delete(id));
  if (options?.emit === false) return;
  emitShoppingOfflineChange();
}

export async function markOutboxFailed(id: string, lastError: string): Promise<void> {
  const entry = await withStore<OutboxEntry | undefined>(OUTBOX_STORE, "readonly", (store) =>
    store.get(id),
  );
  if (!entry) return;
  await withStore(OUTBOX_STORE, "readwrite", (store) =>
    store.put({ ...entry, status: "failed", lastError }),
  );
  emitShoppingOfflineChange();
}

/** Re-queue failed rows as pending so drain will attempt them again. */
export async function retryFailedOutbox(pantryId: string): Promise<number> {
  const failed = (await listOutbox(pantryId)).filter((entry) => entry.status === "failed");
  for (const entry of failed) {
    await withStore(OUTBOX_STORE, "readwrite", (store) =>
      store.put({
        id: entry.id,
        pantryId: entry.pantryId,
        createdAt: entry.createdAt,
        actionPath: entry.actionPath,
        fields: entry.fields,
        status: "pending",
      }),
    );
  }
  if (failed.length > 0) emitShoppingOfflineChange();
  return failed.length;
}

export async function peekOutbox(pantryId: string): Promise<OutboxEntry | null> {
  const entries = await listOutbox(pantryId);
  return entries.find((entry) => entry.status === "pending") ?? null;
}

export async function countOutbox(pantryId: string) {
  const entries = await listOutbox(pantryId);
  return {
    pending: entries.filter((entry) => entry.status === "pending").length,
    failed: entries.filter((entry) => entry.status === "failed").length,
  };
}

function oddBitIdFromEntry(entry: OutboxEntry): string | null {
  const intent = entry.fields.intent ?? "";
  if (intent === "add-odd-bit") {
    const id = (entry.fields.id ?? entry.fields.clientPendingId ?? "").trim();
    return id || null;
  }
  if (intent === "toggle-odd-bit" || intent === "remove-odd-bit") {
    const id = (entry.fields.id ?? "").trim();
    return id || null;
  }
  return null;
}

function isPendingAdd(entry: OutboxEntry, oddBitId: string) {
  return (
    entry.fields.intent === "add-odd-bit" &&
    oddBitIdFromEntry(entry) === oddBitId &&
    entry.status === "pending"
  );
}

/** Cancel a queued odd-bit add and any follow-up toggle/remove for the same id. */
export async function cancelPendingOddBitAdd(pantryId: string, oddBitId: string) {
  const matches = (await listOutbox(pantryId)).filter((entry) => {
    if (entry.status !== "pending") return false;
    return oddBitIdFromEntry(entry) === oddBitId;
  });
  for (const entry of matches) {
    await removeOutboxEntry(entry.id);
  }
}

/** @deprecated Prefer enqueueing a toggle-odd-bit outbox row with the client id. */
export async function patchPendingOddBitAdd(
  pantryId: string,
  oddBitId: string,
  purchased: boolean,
) {
  const entry = (await listOutbox(pantryId)).find((row) => isPendingAdd(row, oddBitId));
  if (!entry) return;
  await withStore(OUTBOX_STORE, "readwrite", (store) =>
    store.put({
      ...entry,
      fields: { ...entry.fields, purchased: String(purchased) },
    }),
  );
  emitShoppingOfflineChange();
}

/** Pending add-odd-bit outbox ids (client UUIDs) still waiting to sync. */
export function queuedOddBitAddIds(entries: OutboxEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.status !== "pending" || entry.fields.intent !== "add-odd-bit") continue;
    const id = oddBitIdFromEntry(entry);
    if (id) ids.add(id);
  }
  return ids;
}
