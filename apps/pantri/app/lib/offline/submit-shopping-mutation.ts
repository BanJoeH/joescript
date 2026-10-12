import { isBrowserOnline } from "~/lib/offline/connectivity";
import { enqueueOutbox } from "~/lib/offline/outbox";

export type SubmitShoppingMutationResult = "online" | "queued";

/**
 * Online: run the provided submit (usually fetcher.submit).
 * Offline: enqueue outbox. Snapshot stays as last loader payload; UI folds
 * pending outbox on hydrate / via busy+local overlays.
 */
export async function submitShoppingMutation(options: {
  pantryId: string;
  action: string;
  fields: Record<string, string>;
  onlineSubmit: (fields: Record<string, string>) => void;
  /** Test seam; defaults to `navigator.onLine`. */
  isOnline?: () => boolean;
  enqueue?: typeof enqueueOutbox;
}): Promise<SubmitShoppingMutationResult> {
  const online = (options.isOnline ?? isBrowserOnline)();
  if (!online) {
    const enqueue = options.enqueue ?? enqueueOutbox;
    await enqueue({
      pantryId: options.pantryId,
      actionPath: options.action,
      fields: options.fields,
    });
    return "queued";
  }

  options.onlineSubmit(options.fields);
  return "online";
}
