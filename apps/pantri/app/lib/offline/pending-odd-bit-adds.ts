import type { OutboxEntry } from "~/lib/offline/types";
import type { OddBit } from "~/lib/recipe-schema";
import {
  SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX,
  SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX,
} from "~/lib/shopping-local-merge";

export { SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX };

type FetcherLike = {
  key?: string;
  state?: string;
  formData?: FormData | null;
  data?: unknown;
};

type AddActionData = {
  oddBit?: OddBit;
  clientPendingId?: string | null;
};

function parseAddData(data: unknown): AddActionData | null {
  if (data == null || typeof data !== "object") return null;
  return data as AddActionData;
}

function bitFromAddFormData(formData: FormData): OddBit | null {
  if (String(formData.get("intent") ?? "") !== "add-odd-bit") return null;
  const name = String(formData.get("name") ?? "").trim();
  const id = String(formData.get("clientPendingId") ?? "").trim();
  if (!name || !id) return null;
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const unitRaw = String(formData.get("unit") ?? "").trim();
  return {
    id,
    name,
    amount: amountRaw ? Number(amountRaw) : null,
    unit: unitRaw || null,
    purchased: String(formData.get("purchased") ?? "") === "true",
  };
}

function bitFromOutboxAdd(entry: OutboxEntry): OddBit | null {
  if (entry.status !== "pending" || entry.fields.intent !== "add-odd-bit") return null;
  const name = (entry.fields.name ?? "").trim();
  const id = (entry.fields.clientPendingId ?? "").trim();
  if (!name || !id) return null;
  const amountRaw = (entry.fields.amount ?? "").trim();
  const unitRaw = (entry.fields.unit ?? "").trim();
  return {
    id,
    name,
    amount: amountRaw ? Number(amountRaw) : null,
    unit: unitRaw || null,
    purchased: entry.fields.purchased === "true",
  };
}

function nameKey(name: string) {
  return name.trim().toLowerCase();
}

function serverHasName(server: OddBit[], name: string) {
  const key = nameKey(name);
  return server.some((bit) => nameKey(bit.name) === key);
}

/**
 * Single source of optimistic odd-bit adds for the shopping list.
 *
 * Rules:
 * - Outbox-drain formData is the sole in-flight UI source for ids it is draining
 *   (outbox does not also contribute those ids — avoids drain+outbox doubles).
 * - If the loader already shows a same-name real row while drain is still
 *   in-flight (realtime revalidate race), suppress the pending row.
 * - Settled `{ oddBit, clientPendingId }` from any fetcher reconciles outbox
 *   pending ids (covers revalidate-before-outbox-remove).
 * - Only `shopping-add-odd-bit:*` fetchers contribute online add formData /
 *   settled rows.
 * - Result is keyed by row id so the same pending id cannot appear twice.
 */
export function collectPendingOddBitAdds(
  fetchers: FetcherLike[],
  outbox: OutboxEntry[],
  server: OddBit[],
): OddBit[] {
  const serverIds = new Set(server.map((bit) => bit.id));
  const byId = new Map<string, OddBit>();

  /** clientPendingId → server odd bit from a successful add action. */
  const reconciled = new Map<string, OddBit>();
  for (const fetcher of fetchers) {
    if (fetcher.state !== "idle") continue;
    const data = parseAddData(fetcher.data);
    if (!data?.oddBit || !data.clientPendingId) continue;
    reconciled.set(data.clientPendingId, data.oddBit);
  }

  /** clientPendingId → pending row while the outbox drain fetcher is submitting. */
  const drainInFlight = new Map<string, OddBit>();
  for (const fetcher of fetchers) {
    const key = fetcher.key ?? "";
    if (!key.startsWith(SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX)) continue;
    if (!fetcher.formData) continue;
    const pending = bitFromAddFormData(fetcher.formData);
    if (pending) drainInFlight.set(pending.id, pending);
  }

  for (const [id, pending] of drainInFlight) {
    if (reconciled.has(id)) continue;
    // Loader won the realtime/revalidate race — don't also show pending:*.
    if (serverHasName(server, pending.name)) continue;
    byId.set(id, pending);
  }

  for (const fetcher of fetchers) {
    const key = fetcher.key ?? "";
    if (key.startsWith(SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX)) continue;
    if (!key.startsWith(SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX)) continue;

    if (fetcher.formData) {
      const pending = bitFromAddFormData(fetcher.formData);
      if (pending && !reconciled.has(pending.id)) {
        byId.set(pending.id, pending);
      }
      continue;
    }

    if (fetcher.state !== "idle") continue;
    const data = parseAddData(fetcher.data);
    if (!data?.oddBit || serverIds.has(data.oddBit.id)) continue;
    byId.set(data.oddBit.id, data.oddBit);
  }

  for (const entry of outbox) {
    const pending = bitFromOutboxAdd(entry);
    if (!pending) continue;

    // Drain formData owns display for this id while submitting.
    if (drainInFlight.has(pending.id)) continue;

    const real = reconciled.get(pending.id);
    if (real) {
      if (!serverIds.has(real.id)) {
        byId.set(real.id, {
          ...real,
          purchased: pending.purchased || real.purchased,
        });
      }
      continue;
    }

    if (serverIds.has(pending.id)) continue;
    byId.set(pending.id, pending);
  }

  return [...byId.values()];
}

export function queuedOfflinePendingOddBitIds(outbox: OutboxEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const entry of outbox) {
    const pending = bitFromOutboxAdd(entry);
    if (pending) ids.add(pending.id);
  }
  return ids;
}
