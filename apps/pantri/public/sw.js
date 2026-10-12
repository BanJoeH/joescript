/* Pantri SW: shopping/sorted document shells + static fallback. Keep path rules in sync with
 * `app/lib/offline/shopping-shell-paths.ts`. */
const CACHE_VERSION = "pantri-shopping-v3";
const PRECACHE = [
  "/offline.html",
  "/site.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/favicon-96x96.png",
  "/apple-touch-icon.png",
  "/pantri-mark.svg",
  "/background-dark.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

function isShoppingShellPath(pathname) {
  return /^\/[^/]+\/shopping(?:\/sorted)?\/?$/.test(pathname);
}

function isDocumentRequest(request) {
  return request.mode === "navigate" || request.destination === "document";
}

function isHashedAsset(url) {
  return url.pathname.startsWith("/assets/");
}

function isPrecachePath(pathname) {
  return PRECACHE.includes(pathname);
}

/** Pull same-origin /assets/* URLs out of a document so offline hard-refresh keeps CSS/JS. */
function assetUrlsFromHtml(html, baseUrl) {
  const urls = new Set();
  const pattern =
    /(?:href|src)=["'](\/assets\/[^"']+)["']|["'](https?:\/\/[^"']+\/assets\/[^"']+)["']/gi;
  let match = pattern.exec(html);
  while (match) {
    const raw = match[1] || match[2];
    try {
      const url = new URL(raw, baseUrl);
      if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
        urls.add(url.pathname + url.search);
      }
    } catch {
      // ignore bad URLs
    }
    match = pattern.exec(html);
  }
  return [...urls];
}

async function putAssetUrls(cache, urls) {
  for (const raw of urls) {
    if (typeof raw !== "string") continue;
    let pathname;
    try {
      const url = new URL(raw, self.location.origin);
      if (url.origin !== self.location.origin || !url.pathname.startsWith("/assets/")) continue;
      pathname = url.pathname + url.search;
    } catch {
      continue;
    }
    if (await cache.match(pathname)) continue;
    try {
      const response = await fetch(pathname, { credentials: "same-origin" });
      if (response.ok) {
        await cache.put(pathname, response.clone());
      }
    } catch {
      // Ignore individual prefetch failures (offline / auth).
    }
  }
}

async function cacheShellDocument(cache, pathname, response) {
  await cache.put(pathname, response.clone());
  try {
    const html = await response.clone().text();
    await putAssetUrls(cache, assetUrlsFromHtml(html, self.location.origin));
  } catch {
    // Document still cached even if asset scrape fails.
  }
}

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
  if (!data || typeof data !== "object") return;

  if (data.type === "PRECACHE_ASSETS" && Array.isArray(data.urls)) {
    event.waitUntil(caches.open(CACHE_VERSION).then((cache) => putAssetUrls(cache, data.urls)));
    return;
  }

  if (data.type !== "PRECACHE_SHELLS" || !Array.isArray(data.urls)) return;

  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      for (const raw of data.urls) {
        if (typeof raw !== "string" || !raw.startsWith("/")) continue;
        let pathname = raw;
        try {
          pathname = new URL(raw, self.location.origin).pathname;
        } catch {
          continue;
        }
        if (!isShoppingShellPath(pathname)) continue;
        try {
          const response = await fetch(pathname, { credentials: "same-origin" });
          if (response.ok) {
            await cacheShellDocument(cache, pathname, response);
          }
        } catch {
          // Ignore individual prefetch failures (offline / auth).
        }
      }
    }),
  );
});

async function networkFirstShoppingShell(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cacheShellDocument(cache, request, response);
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

async function networkOrOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_VERSION);
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

  // Never intercept API / auth / SSE / connectivity probe — always network.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/api/events") ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname === "/_pantri_online_probe"
  ) {
    return;
  }

  // Do not cache recipe / share / photo routes (navigations get offline fallback only).
  if (isDocumentRequest(request)) {
    if (isShoppingShellPath(url.pathname)) {
      event.respondWith(networkFirstShoppingShell(request));
      return;
    }
    event.respondWith(networkOrOfflineFallback(request));
    return;
  }

  if (isHashedAsset(url) || isPrecachePath(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
