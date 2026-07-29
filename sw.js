/* Ironbound service worker — farming app shell for offline + home-screen install */
const CACHE = 'ironbound-farm-v19';
const ASSETS = [
  './',
  './index.html',
  './app-backend.js',
  './manifest.webmanifest',
  './icon.svg',
  './assets/farm/fertiliser-compost-64.png',
  './assets/farm/planter-bed-128x96.png',
  './assets/farm/crops/radish-planted-64.png',
  './assets/farm/crops/radish-ready-planted-64.png',
  './assets/farm/crops/radish-crop-64.png',
  './assets/farm/crops/radish-seeds-96.png',
  './assets/farm/ui/walk-to-grow-hero-960.webp',
  './assets/farm/ui/gold-coin-64.png',
  './assets/farm/ui/step-token-64.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first keeps deployed updates fresh; cached app shell remains available offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok && new URL(req.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((openClients) => {
      const existing = openClients.find((client) => client.url.includes('/WorkoutMoneyApp/'));
      if (existing) return existing.focus();
      return clients.openWindow('./');
    })
  );
});
