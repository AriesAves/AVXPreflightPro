// AVX Preflight Pro — Print Validation Platform
const CACHE_NAME = 'AVX-Preflight-Pro-v1';

const SHELL_FILES = [
  '/AVX-Preflight-Pro/',
  '/AVX-Preflight-Pro/index.html',
  '/AVX-Preflight-Pro/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass through Supabase, API calls, and non-GET requests
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('cdn.') ||
    url.hostname.includes('fonts.') ||
    url.hostname.includes('cdnjs.') ||
    request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then(cached => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/AVX-Preflight-Pro/index.html');
          }
        });
      })
  );
});

self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'AVX Tool HUB', {
    body: data.body || '',
    icon: '/AVX-Preflight-Pro/icons/AVXlogo2 - Copy.png',',
    badge: '/AVX-Preflight-Pro/icons/AVXlogo2 - Copy.png','
  });
});
