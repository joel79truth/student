// CHANGE: increment cache version to force a new cache
const CACHE_NAME = "smp-v2";

const urlsToCache = [
  "/",
  "/index.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // NEW: delete any old caches (including "smp-v1")
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Only serve cached responses that are actually successful (status 200)
      if (cachedResponse && cachedResponse.ok) {
        return cachedResponse;
      }
      // Otherwise go to network
      return fetch(event.request);
    })
  );
});
