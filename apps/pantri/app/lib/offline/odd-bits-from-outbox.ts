import { collectPendingOddBitAdds } from "~/lib/offline/pending-odd-bit-adds";
import type { OutboxEntry } from "~/lib/offline/types";
import type { OddBit } from "~/lib/recipe-schema";

/** Pending add-odd-bit outbox rows that are not already on the server list. */
export function oddBitsFromOutbox(entries: OutboxEntry[], server: OddBit[]): OddBit[] {
  return collectPendingOddBitAdds([], entries, server);
}
