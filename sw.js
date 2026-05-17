// Astrolab Service Worker
// Versi cache — update angka ini setiap deploy baru
const CACHE_NAME = "astrolab-v1";

// File yang di-cache untuk offline
const STATIC_ASSETS = [
  "/cendekia-ipa/",
  "/cendekia-ipa/index.html",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: hapus cache lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network first, fallback ke cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET dan Firebase requests
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("firebasedatabase") ||
    event.request.url.includes("firebaseio") ||
    event.request.url.includes("googleapis")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache response baru
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback ke cache saat offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback ke index.html untuk SPA routing
          return caches.match("/cendekia-ipa/index.html");
        });
      })
  );
});
