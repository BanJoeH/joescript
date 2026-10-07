/* Pantri service worker: precache shell assets, network-first documents. */
const CACHE_VERSION = "pantri-v2";
const PRECACHE = [
  "/",
  "/offline.html",
  "/site.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/favicon-96x96.png",
  "/apple-touch-icon.png",
  "/pantri-mark.svg",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "PRECACHE_SHELLS" || !Array.isArray(data.urls)) return;

  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      for (const raw of data.urls) {
        if (typeof raw !== "string" || !raw.startsWith("/")) continue;
        try {
          const response = await fetch(raw, { credentials: "same-origin" });
          if (response.ok) {
            await cache.put(raw, response.clone());
          }
        } catch {
          // Ignore individual prefetch failures (offline / auth).
        }
      }
    }),
  );
});

function isDocumentRequest(request) {
  return request.mode === "navigate" || request.destination === "document";
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webmanifest")
  );
}

async function networkFirstDocument(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Exact document only — wrong HTML at this URL breaks RR hydration.
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match("/offline.html");
    if (offline) return offline;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    void networkPromise;
    return cached;
  }

  const network = await networkPromise;
  if (network) return network;
  return new Response("Offline", { status: 503, statusText: "Offline" });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Bypass API / auth / SSE — always network.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname.includes("/api/events")
  ) {
    return;
  }

  if (isDocumentRequest(request)) {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  // Recipe photo bytes — cache after first online view.
  if (/\/photos\/[^/]+$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (isStaticAsset(url) || PRECACHE.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
