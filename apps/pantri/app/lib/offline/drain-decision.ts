import { interpretActionData } from "~/lib/offline/interpret-action-data";
import type { OutboxEntry } from "~/lib/offline/types";

export type OutboxDrainDecision = {
  entryId: string;
  /** True only for explicit `{ ok: true }` without `error`. */
  remove: boolean;
  failReason?: string;
  next: OutboxEntry | null;
  shouldRevalidate: boolean;
};

/**
 * Pure drain step: given settled action data and the next pending outbox head,
 * decide whether to remove/fail the active entry and whether to continue or revalidate.
 */
export function decideOutboxDrainStep(
  actionData: unknown,
  entryId: string,
  nextPending: OutboxEntry | null,
): OutboxDrainDecision {
  const result = interpretActionData(actionData);
  if (result.ok) {
    return {
      entryId,
      remove: true,
      next: nextPending,
      shouldRevalidate: nextPending === null,
    };
  }
  return {
    entryId,
    remove: false,
    failReason: result.reason,
    next: nextPending,
    shouldRevalidate: nextPending === null,
  };
}
