const CACHE_VERSION = "levelup-shell-v1";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon-maskable-512x512.png",
  "/icon.svg",
  "/apple-icon.png",
];

async function precacheShell(cache) {
  const shellResponse = await fetch("/", { cache: "no-store" });
  if (!shellResponse.ok) throw new Error("Unable to fetch the app shell");

  const shellHtml = await shellResponse.clone().text();
  await cache.put("/", shellResponse);

  const discoveredAssets = [...shellHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => url.startsWith("/") && !url.startsWith("//"));

  await Promise.all([
    ...PRECACHE_URLS.filter((url) => url !== "/").map((url) => cache.add(url)),
    ...[...new Set(discoveredAssets)].map((url) => cache.add(url)),
  ]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => precacheShell(cache)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("levelup-") && ![CACHE_VERSION, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isStaticAsset(request) {
  const { pathname } = new URL(request.url);
  return pathname.startsWith("/_next/static/")
    || /\.(?:css|ico|jpeg|jpg|js|png|svg|webmanifest|woff|woff2)$/i.test(pathname);
}

async function cacheResponse(cacheName, request, response) {
  if (response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOrigin(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => cacheResponse(CACHE_VERSION, request, response))
        .catch(async () => (await caches.match(request)) || (await caches.match("/")) || caches.match("/offline.html")),
    );
    return;
  }

  if (!isStaticAsset(request)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => cacheResponse(RUNTIME_CACHE, request, response));
    }),
  );
});
