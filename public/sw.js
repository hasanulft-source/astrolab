// Astrolab Service Worker — v3 (dengan FCM support)
const CACHE_NAME = "astrolab-v3";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network first — fallback cache
// Skip: Firebase Realtime DB, FCM, googleapis
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = e.request.url;
  if (
    url.includes("firebasedatabase") ||
    url.includes("firebaseio") ||
    url.includes("fcm.googleapis") ||
    url.includes("firebase-messaging") ||
    url.includes("gstatic.com/firebasejs")
  ) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});