import { enqueueOutbox } from "~/lib/offline/outbox";

export type SubmitShoppingMutationResult = "queued";

/**
 * Local-first: always enqueue to the outbox. The UI reads snapshot+outbox;
 * ShoppingOutboxDrain syncs in the background when online.
 */
export async function submitShoppingMutation(options: {
  pantryId: string;
  action: string;
  fields: Record<string, string>;
  enqueue?: typeof enqueueOutbox;
}): Promise<SubmitShoppingMutationResult> {
  const enqueue = options.enqueue ?? enqueueOutbox;
  await enqueue({
    pantryId: options.pantryId,
    actionPath: options.action,
    fields: options.fields,
  });
  return "queued";
}
