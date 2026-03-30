const CACHE_NAME = "smp-v3";

// Install: activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Helper: skip things we should not touch
function shouldSkipFetch(request) {
  const url = new URL(request.url);

  if (request.method !== "GET") return true;

  if (url.hostname.includes("supabase.co")) return true;
  if (url.hostname.includes("googleapis.com")) return true;
  if (url.hostname.includes("apis.google.com")) return true;

  if (url.pathname.startsWith("/api/")) return true;

  return false;
}

// Fetch: network-first (SAFE strategy)
self.addEventListener("fetch", (event) => {
  if (shouldSkipFetch(event.request)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses (optional but useful)
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(() => {
        // Fallback to cache if offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;

          // Final fallback (avoid white screen)
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return new Response(
              "<h1>Offline</h1><p>Please check your connection.</p>",
              { headers: { "Content-Type": "text/html" } }
            );
          }
        });
      })
  );
});