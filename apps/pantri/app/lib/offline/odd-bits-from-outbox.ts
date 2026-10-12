import type { OutboxEntry } from "~/lib/offline/types";
import type { OddBit } from "~/lib/recipe-schema";

/** Pending add-odd-bit outbox rows that are not already on the server list. */
export function oddBitsFromOutbox(entries: OutboxEntry[], server: OddBit[]): OddBit[] {
  const serverIds = new Set(server.map((bit) => bit.id));
  const byId = new Map<string, OddBit>();

  for (const entry of entries) {
    if (entry.status !== "pending") continue;
    if (entry.fields.intent !== "add-odd-bit") continue;
    const name = (entry.fields.name ?? "").trim();
    const id = (entry.fields.id ?? entry.fields.clientPendingId ?? "").trim();
    if (!name || !id || serverIds.has(id)) continue;
    const amountRaw = (entry.fields.amount ?? "").trim();
    const unitRaw = (entry.fields.unit ?? "").trim();
    byId.set(id, {
      id,
      name,
      amount: amountRaw ? Number(amountRaw) : null,
      unit: unitRaw || null,
      purchased: entry.fields.purchased === "true",
    });
  }

  return [...byId.values()];
}
