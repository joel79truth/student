// Increment cache version to force a new cache
const CACHE_NAME = "smp-v2";

// List of static assets to cache on install
const urlsToCache = [
  "/",
  "/index.html"
  // Add other static assets (CSS, JS, images) as needed
];

// Helper: determine if a request should be ignored by the service worker
function shouldSkipFetch(request) {
  const url = new URL(request.url);
  
  // Skip non-GET requests (e.g., POST, PUT)
  if (request.method !== "GET") return true;
  
  // Skip API and third-party services
  if (url.hostname.includes("supabase.co")) return true;     // Supabase
  if (url.hostname.includes("googleapis.com")) return true;  // Google APIs
  if (url.hostname.includes("apis.google.com")) return true; // Google Identity Toolkit
  if (url.pathname.startsWith("/api/")) return true;        // Your own API
  
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Delete old caches (e.g., "smp-v1")
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
  // If this request should not be handled by the service worker, let the browser handle it directly
  if (shouldSkipFetch(event.request)) {
    return;
  }

  // For static assets: cache-first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse && cachedResponse.ok) {
        return cachedResponse;
      }
      return fetch(event.request).catch((error) => {
        console.error("Fetch failed for", event.request.url, error);
        // Return a fallback offline response
        return new Response("Offline – please check your connection", {
          status: 503,
          statusText: "Service Unavailable"
        });
      });
    })
  );
});