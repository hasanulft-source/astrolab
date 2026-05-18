// Astrolab — Firebase Messaging Service Worker
// File ini HARUS ada di /public/ dan di-serve dari root domain

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDUUUr43q_GYT1IssuWYa_nPliKKOQPGlE", // tidak dipakai untuk messaging SW, tapi wajib ada
  authDomain: "astrolab-classroom.firebaseapp.com",
  databaseURL: "https://astrolab-classroom-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "astrolab-classroom",
  storageBucket: "astrolab-classroom.appspot.com",
  messagingSenderId: "21058860325",
  appId: "astrolab-classroom",
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  console.log("[Astrolab SW] Background message received:", payload);

  const { title, body, icon, data } = payload.notification || {};
  const notifData = payload.data || {};

  self.registration.showNotification(title || "Astrolab", {
    body: body || "Ada notifikasi baru untukmu!",
    icon: icon || "/cendekia-ipa/icon-192.png",
    badge: "/cendekia-ipa/icon-192.png",
    tag: notifData.type || "astrolab",
    data: notifData,
    vibrate: [200, 100, 200],
    actions: notifData.type === "chat"
      ? [{ action: "open_chat", title: "Buka Pesan" }]
      : notifData.type === "tugas"
        ? [{ action: "open_tugas", title: "Lihat Tugas" }]
        : [{ action: "open_app", title: "Buka Astrolab" }],
  });
});

// Handle notif click — buka app ke halaman yang relevan
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  let url = "/cendekia-ipa/";

  if (e.action === "open_chat" || data.type === "chat") url = "/cendekia-ipa/#chat";
  else if (e.action === "open_tugas" || data.type === "tugas") url = "/cendekia-ipa/#tugas";
  else if (data.type === "broadcast") url = "/cendekia-ipa/#home";

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/cendekia-ipa") && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
