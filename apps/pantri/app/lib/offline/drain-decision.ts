import { interpretActionData } from "~/lib/offline/interpret-action-data";
import type { OutboxEntry } from "~/lib/offline/types";

export type OutboxDrainDecision = {
  entryId: string;
  /** True only for explicit `{ ok: true }` without `error`, or already-converged errors. */
  remove: boolean;
  /**
   * Drop the outbox row without folding into the snapshot (e.g. toggle of a
   * row another device already deleted — fold would resurrect local state).
   */
  skipFold?: boolean;
  failReason?: string;
  next: OutboxEntry | null;
  shouldRevalidate: boolean;
};

const NOT_FOUND_RE = /\bnot found\b/i;

function isRemoveIntent(intent: string | undefined) {
  return intent === "remove-odd-bit" || intent === "remove-recipe";
}

function isToggleIntent(intent: string | undefined) {
  return intent === "toggle-odd-bit" || intent === "toggle-ingredient" || intent === "toggle";
}

/** Remote delete / missing target — treat as converged so drain doesn't stick. */
export function isAlreadyConvergedFailure(reason: string, intent: string | undefined) {
  if (!NOT_FOUND_RE.test(reason)) return false;
  return isRemoveIntent(intent) || isToggleIntent(intent);
}

/**
 * Pure drain step: given settled action data and the next pending outbox head,
 * decide whether to remove/fail the active entry and whether to continue or revalidate.
 */
export function decideOutboxDrainStep(
  actionData: unknown,
  entryId: string,
  nextPending: OutboxEntry | null,
  activeIntent?: string,
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

  if (isAlreadyConvergedFailure(result.reason, activeIntent)) {
    return {
      entryId,
      remove: true,
      // Removals still fold (apply delete locally). Toggles skip fold so we
      // don't keep purchased state for a server-deleted row.
      skipFold: isToggleIntent(activeIntent),
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
