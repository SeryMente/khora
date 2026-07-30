// @l0 L0-002-R · @req PWA-03,PWA-04,IF-SW-01
const CACHE_NAME = 'khora-cache-v1';

const ALLOWLIST = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  // Do NOT call skipWaiting() here. Wait until explicitly requested.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ALLOWLIST);
    }).then(() => {
      // Notify clients that an update is ready
      return self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'KHORA_UPDATE_READY' });
        });
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude API and user content strictly
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/sistema/')) {
    return; // Let it pass through to network
  }

  // Network-first for GET requests
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache if allowlisted (although install does it too)
          if (ALLOWLIST.includes(url.pathname) && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed, fallback to cache
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // If it is a navigation request, return offline page
          if (event.request.mode === 'navigate') {
            return cache.match('/offline');
          }

          return Response.error();
        })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'KHORA_ACTIVATE_UPDATE') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'KHORA_SYNC_REQUEST') {
    // Attempt background sync registration if available
    if ('sync' in self.registration) {
      self.registration.sync.register('khora-sync-queue')
        .catch((err) => {
          console.warn('Background sync registration failed:', err);
        });
    }
    // If not available, we fail silently as instructed (do not guarantee support)
  }
});
