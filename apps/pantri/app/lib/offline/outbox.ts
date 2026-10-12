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

export async function removeOutboxEntry(id: string): Promise<void> {
  await withStore(OUTBOX_STORE, "readwrite", (store) => store.delete(id));
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

function isPendingAdd(entry: OutboxEntry, clientPendingId: string) {
  return (
    entry.fields.intent === "add-odd-bit" &&
    entry.fields.clientPendingId === clientPendingId &&
    entry.status === "pending"
  );
}

/** Cancel an offline odd-bit add that has not drained yet. */
export async function cancelPendingOddBitAdd(pantryId: string, clientPendingId: string) {
  const matches = (await listOutbox(pantryId)).filter((entry) =>
    isPendingAdd(entry, clientPendingId),
  );
  for (const entry of matches) {
    await removeOutboxEntry(entry.id);
  }
}

/** Update purchased on a queued add so offline toggles survive until drain. */
export async function patchPendingOddBitAdd(
  pantryId: string,
  clientPendingId: string,
  purchased: boolean,
) {
  const entry = (await listOutbox(pantryId)).find((row) => isPendingAdd(row, clientPendingId));
  if (!entry) return;
  await withStore(OUTBOX_STORE, "readwrite", (store) =>
    store.put({
      ...entry,
      fields: { ...entry.fields, purchased: String(purchased) },
    }),
  );
  emitShoppingOfflineChange();
}
