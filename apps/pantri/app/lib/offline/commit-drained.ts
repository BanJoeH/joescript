import { applyOutboxToSnapshot } from "~/lib/offline/apply-outbox";
import { emitShoppingOfflineChange } from "~/lib/offline/events";
import { removeOutboxEntry } from "~/lib/offline/outbox";
import { putShoppingSnapshot, readShoppingSnapshot } from "~/lib/offline/snapshot";
import type { OutboxEntry } from "~/lib/offline/types";

/**
 * Fold a successfully synced outbox entry into the snapshot base, then remove
 * it. Without this, applied view briefly reverts (base still stale, entry gone)
 * until the next loader revalidation — which is janky when draining a queue.
 *
 * Emits a single offline-change event so the UI refreshes once.
 */
export async function commitDrainedOutboxEntry(entry: OutboxEntry): Promise<void> {
  const snap = await readShoppingSnapshot(entry.pantryId);
  if (snap) {
    const folded = applyOutboxToSnapshot(snap, [{ ...entry, status: "pending" }]);
    await putShoppingSnapshot(folded, { emit: false });
  }
  await removeOutboxEntry(entry.id, { emit: false });
  emitShoppingOfflineChange();
}
