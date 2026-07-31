/* Ironbound service worker — farming app shell for offline + home-screen install */
const CACHE = 'ironbound-farm-v33';
const CROP_IDS = [
  'radish','lettuce','spinach','carrot','onion','beetroot','blueberry','peas','potato','strawberry','pepper',
  'tomato','corn','eggplant','cabbage','broccoli','pumpkin','grapes','melon','dragonfruit','starfruit','ancient-root'
];
const GEAR_IDS = [
  'meadow-treads','dewrunner','mossbound','riverstone','suntrail','harvestmoon','cloudstep','starroot',
  'seedkeeper','clayhand','bramblegrip','pollinator-touch','moonweave','greenfingers','orchard-warden',
  'starlight-wraps','raincall','rootwake','brookglass','windrow','silverleaf','sunspoke','goldenhour','rainstaff'
];
const FERTILISER_ART_IDS = [
  'speed-bronze','speed-silver','speed-gold','speed-iridium',
  'quality-bronze','quality-silver','quality-gold','quality-iridium'
];
const GENERATED_ART = [
  ...CROP_IDS.flatMap((id) => [
    `./assets/farm/crops/${id}-seeds-96.png`,
    `./assets/farm/crops/${id}-planted-64.png`,
    `./assets/farm/crops/${id}-grown-64.png`,
    `./assets/farm/crops/${id}-crop-64.png`
  ]),
  ...GEAR_IDS.map((id) => `./assets/farm/gear/${id}-96.png`),
  ...FERTILISER_ART_IDS.map((id) => `./assets/farm/fertilisers/${id}-96.png`),
  ...['tilda','bram','nia'].map((id) => `./assets/farm/npcs/${id}-96.png`)
];
const UI_V3_ART = [
  './assets/farm/ui-v3/theme-v3.css',
  './assets/farm/ui-v3/avatar-96.png',
  './assets/farm/ui-v3/nav-farm-64.png',
  './assets/farm/ui-v3/nav-shop-64.png',
  './assets/farm/ui-v3/nav-quests-64.png',
  './assets/farm/ui-v3/nav-silo-64.png',
  './assets/farm/ui-v3/nav-upgrade-64.png',
  './assets/farm/ui-v3/weather-partly-sunny-64.png',
  './assets/farm/ui-v3/step-currency-v2-96.png',
  './assets/farm/ui-v3/gold-currency-v2-96.png',
  ...['garden-paths','rain-barrel','seed-ledger','compost-bin','deep-beds','glass-cloche','market-cart','pollinator-garden','moon-irrigation','ancient-greenhouse']
    .map((id) => `./assets/farm/upgrades-v3/${id}-192.png`)
];
const ASSETS = [
  './',
  './index.html',
  './app-backend.js',
  './manifest.webmanifest',
  './icon.svg',
  './assets/farm/fertiliser-compost-64.png',
  './assets/farm/planter-bed-terrain-v4-256x232.png',
  './assets/farm/ui/farm-background-v2.webp',
  './assets/farm/ui/farm-background-meadow-v4.webp',
  './assets/farm/ui/farm-ground-planter-v4.webp',
  './assets/farm/ui/gold-coin-64.png',
  './assets/farm/ui/step-token-64.png',
  ...UI_V3_ART,
  ...GENERATED_ART
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
