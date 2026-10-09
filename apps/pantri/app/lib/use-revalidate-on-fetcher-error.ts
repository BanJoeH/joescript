import { useEffect, useRef } from "react";
import { useFetchers, useRevalidator } from "react-router";

/**
 * When any keyed fetcher settles with `{ error }`, revalidate once so local
 * optimistic mirrors resync from the loader instead of staying wrong.
 */
export function useRevalidateOnFetcherError() {
  const fetchers = useFetchers();
  const revalidator = useRevalidator();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    for (const fetcher of fetchers) {
      if (fetcher.state !== "idle" || fetcher.data == null || typeof fetcher.data !== "object") {
        continue;
      }
      const data = fetcher.data as { error?: unknown };
      if (typeof data.error !== "string" || data.error.length === 0) continue;

      const key = `${fetcher.key}:${data.error}`;
      if (handled.current.has(key)) continue;
      handled.current.add(key);
      revalidator.revalidate();
    }
  }, [fetchers, revalidator]);
}
