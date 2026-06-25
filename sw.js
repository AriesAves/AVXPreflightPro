// AVX Preflight Pro Print Validation Platform
// Version bump this string whenever you deploy changes to force cache refresh
const CACHE_NAME = 'avx-hub-v1';

// Files to cache for offline shell
const SHELL_FILES = [
  '/AVX-Preflight-Pro/',
  '/AVX-Preflight-Pro/index.html',
  '/AVX-Preflight-Pro/manifest.json'
];

// ── Install: cache the app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim(); // Take control of open tabs immediately
});

// ── Fetch: Network-first strategy ─────────────────────────────────────────────
// Always tries network first (so Supabase calls go through live),
// falls back to cache if offline.
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Let Supabase and external API calls pass through directly — never cache them
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('anthropic.com') ||
    request.method !== 'GET'
  ) {
    return; // Let the browser handle it normally
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache a fresh copy of app shell files on every successful fetch
        if (response.ok && SHELL_FILES.some(f => request.url.endsWith(f.replace('/AVX-Preflight-Pro', '')))) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback — serve from cache
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // If nothing cached, return the index for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/AVX-Preflight-Pro/index.html');
          }
        });
      })
  );
});

// ── Push Notifications (optional, for future use) ────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'AVX Preflight Pro', {
    body: data.body || '',
    icon: '/AVX-Preflight-Pro/icons/AVXlogo2 - Copy.png',
    badge: '/AVX-Preflight-Pro/icons/AVXlogo2 - Copy.png'
  });
});
