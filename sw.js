/* RepDrop app shell — offline-first exercise tracking and collectibles. */
const CACHE = "repdrop-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./repdrop.css?v=1",
  "./repdrop.js?v=1",
  "./manifest.webmanifest",
  "./icon.svg",
  "./assets/farm/ui-v3/step-currency-v2-96.png",
  "./assets/repdrop/repdrop-capsule-open-v1.webp",
  "./assets/repdrop/ruby-gem-card-v1.webp",
  "./assets/repdrop/sapphire-gem-card-v1.webp",
  "./assets/repdrop/emerald-gem-card-v1.webp",
  "./assets/repdrop/amethyst-gem-card-v1.webp",
  "./assets/repdrop/citrine-gem-card-v1.webp",
  "./assets/repdrop/diamond-gem-card-v1.webp",
  "./assets/repdrop/aquamarine-gem-card-v1.webp",
  "./assets/repdrop/opal-gem-card-v1.webp",
  "./assets/repdrop/garnet-gem-card-v1.webp",
  "./assets/repdrop/peridot-gem-card-v1.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response?.ok && new URL(event.request.url).origin === location.origin) {
        caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      }
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((openClients) => {
      const existing = openClients.find((client) => client.url.includes("/WorkoutMoneyApp/"));
      return existing ? existing.focus() : clients.openWindow("./");
    })
  );
});
