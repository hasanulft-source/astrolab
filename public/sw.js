// Astrolab Classroom — Service Worker for Push Notifications
// Handles incoming push events and notification clicks

self.addEventListener("push", (event) => {
  let data = { title: "Astrolab Classroom", body: "Notifikasi baru", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    // fallback if payload isn't JSON
    data.body = event.data ? event.data.text() : data.body;
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "astrolab-" + Date.now(),
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() => {
      // Set badge count on app icon (supported on Android Chrome 81+, iOS Safari 16.4+)
      if (self.navigator?.setAppBadge) {
        self.navigator.setAppBadge().catch(() => {});
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  // Clear badge when user taps notification
  if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return clients.openWindow(url);
    })
  );
});

// Activate immediately — no caching, just push handling
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));
