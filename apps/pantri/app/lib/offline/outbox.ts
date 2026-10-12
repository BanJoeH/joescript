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
