import { createRequestHandler } from "react-router";

export { PantryHub } from "./pantry-hub";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

/** Only public share OG images may be edge-cached (see share.$token.og.png). */
const EDGE_CACHEABLE_PATH = /\/r\/[^/]+\/og\.png$/;

/**
 * Workers Cache (`cache.enabled` in wrangler) caches GETs that lack Cache-Control
 * via heuristic freshness. That made shopping loader `.data` / HTML stick after
 * successful POSTs — deletes snapped back and purchased toggles vanished on refresh.
 */
function withAppCacheHeaders(request: Request, response: Response): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return response;
  }

  const url = new URL(request.url);
  if (EDGE_CACHEABLE_PATH.test(url.pathname)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request) {
    const response = await requestHandler(request);
    return withAppCacheHeaders(request, response);
  },
} satisfies ExportedHandler<Env>;
