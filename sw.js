
const SHELL_CACHE = 'nsirs-shell-v1';
const RUNTIME_CACHE = 'nsirs-runtime-v1';
const SHELL_ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isRuntimeCacheable(url) {
  return (
    url.origin === self.location.origin ||
    url.hostname.includes('openstreetmap.org') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('googleapis.com')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (isRuntimeCacheable(url) && req.method === 'GET') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const fetchPromise = fetch(req)
            .then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                cache.put(req, networkRes.clone());
              }
              return networkRes;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
  }
});
