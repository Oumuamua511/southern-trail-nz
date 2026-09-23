/* Offline shell for the GitHub Pages project path. Remote resources stay outside this cache. */
const CACHE_NAME = 'southern-trail-nz-v1';
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/trip-experience.css',
  './assets/reminder.css',
  './assets/field-tools.css',
  './assets/budget-tool.css',
  './assets/trip-data.js',
  './assets/trip-experience.js',
  './assets/reminder.js',
  './assets/field-tools.js',
  './assets/budget-tool.js',
  './assets/icons/adventure.png',
  './assets/icons/car.png',
  './assets/icons/city.png',
  './assets/icons/cruise.png',
  './assets/icons/deer.png',
  './assets/icons/flight.png',
  './assets/icons/helicopter.png',
  './assets/icons/jetboat.png',
  './assets/icons/lake.png',
  './assets/icons/lodge.png',
  './assets/icons/lone-tree.png',
  './assets/icons/mountain.png',
  './assets/icons/signal.png',
  './assets/icons/stargazing.png',
  './assets/icons/supplies.png',
  './assets/icons/weather.png'
];

function scopedUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

function isSameOriginInScope(requestUrl) {
  const scopeUrl = new URL(self.registration.scope);
  return requestUrl.origin === self.location.origin
    && requestUrl.pathname.startsWith(scopeUrl.pathname);
}

async function cacheNavigation(request) {
  const requestedPath = new URL(request.url).pathname;
  const appPaths = [scopedUrl('./'), scopedUrl('./index.html')].map((url) => new URL(url).pathname);
  const isAppPage = appPaths.includes(requestedPath);
  try {
    const response = await fetch(request);
    if (response.ok && isAppPage && /text\/html/i.test(response.headers.get('Content-Type') || '')) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(scopedUrl('./index.html'), response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request)
      || (isAppPage && (await caches.match(scopedUrl('./index.html')) || await caches.match(scopedUrl('./'))));
    return cached || new Response('当前处于离线状态，暂时无法打开行程。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function cacheStaticAsset(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(LOCAL_ASSETS.map(scopedUrl)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('southern-trail-nz-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'GET' || !isSameOriginInScope(requestUrl)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(cacheNavigation(event.request));
    return;
  }

  event.respondWith(cacheStaticAsset(event.request));
});
