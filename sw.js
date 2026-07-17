/* Ironbound service worker — app-shell cache for offline + home-screen install */
const CACHE = 'ironbound-v19';
const ASSETS = ['./', './index.html', './app-backend.js', './manifest.webmanifest', './icon.svg', './assets/rat-warrens-cover.png', './assets/forest-background.png', './assets/market-item-template.png',
  './assets/rat-idle-frames/frame-001-ChatGPT-Image-Jul-16-2026-09_44_37-PM-001-160x160.png',
  './assets/rat-idle-frames/frame-002-ChatGPT-Image-Jul-16-2026-09_44_37-PM-002-160x160.png',
  './assets/rat-idle-frames/frame-003-ChatGPT-Image-Jul-16-2026-09_44_37-PM-003-160x160.png',
  './assets/rat-idle-frames/frame-004-ChatGPT-Image-Jul-16-2026-09_44_37-PM-004-160x160.png',
  './assets/rat-idle-frames/frame-005-ChatGPT-Image-Jul-16-2026-09_44_37-PM-005-160x160.png',
  './assets/rat-idle-frames/frame-006-ChatGPT-Image-Jul-16-2026-09_44_37-PM-006-160x160.png',
  './assets/rat-idle-frames/frame-007-ChatGPT-Image-Jul-16-2026-09_44_37-PM-007-160x160.png',
  './assets/rat-idle-frames/frame-008-ChatGPT-Image-Jul-16-2026-09_44_37-PM-008-160x160.png',
  './assets/rat-idle-frames/frame-009-ChatGPT-Image-Jul-16-2026-09_44_37-PM-009-160x160.png'];

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
