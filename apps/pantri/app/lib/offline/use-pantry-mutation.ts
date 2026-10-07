import { useCallback } from "react";
import { useFetcher, useRevalidator } from "react-router";

import { shouldQueueIntent, submitOrQueue } from "~/lib/offline/outbox";

type SubmitData = Record<string, string> | FormData;

function toFormData(data: SubmitData) {
  if (data instanceof FormData) return data;
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  return formData;
}

/** Submit a pantry action online, or queue + revalidate from IndexedDB when offline. */
export function usePantryMutation(pantryId: string, fetcherKey?: string) {
  const fetcher = useFetcher({ key: fetcherKey });
  const revalidator = useRevalidator();

  const submit = useCallback(
    async (data: SubmitData, action: string) => {
      const formData = toFormData(data);
      const intent = String(formData.get("intent") ?? "");
      const result = await submitOrQueue({
        pantryId,
        actionUrl: action,
        formData,
        fetcherSubmit: (body, opts) => fetcher.submit(body, opts),
      });
      // Shopping intents use fetch (not fetcher) so we always revalidate to refresh loader data.
      if (result === "queued" || shouldQueueIntent(intent)) {
        revalidator.revalidate();
      }
      return result;
    },
    [fetcher, pantryId, revalidator],
  );

  return { fetcher, submit };
}
