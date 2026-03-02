// sw.js
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
});

self.addEventListener('fetch', (event) => {
  // You can add caching logic later
  event.respondWith(fetch(event.request));
});