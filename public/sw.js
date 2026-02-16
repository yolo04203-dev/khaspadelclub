// Service Worker v3
const CACHE_NAME = 'khas-padel-v3';
const FONT_CACHE = 'khas-fonts-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== FONT_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for pages, cache-first for fonts/static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls or OAuth redirects
  if (
    url.pathname.startsWith('/~oauth') ||
    url.hostname.includes('supabase') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Cache-first for Google Fonts
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  const isNavigate = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Serve offline fallback for navigation requests
          if (isNavigate) return caches.match('/offline.html');
          return cached; // undefined – browser default error
        })
      )
  );
});

// Background sync foundation
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync triggered');
    // Future: replay queued mutations here
  }
});
