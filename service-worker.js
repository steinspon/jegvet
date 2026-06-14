/*
 * JegVet service worker — offline support and faster repeat loads.
 *
 * Strategy:
 *  - Precache the application shell on install.
 *  - Same-origin GET requests are served cache-first with a background refresh
 *    (stale-while-revalidate), so the app works offline and updates quietly.
 *  - Navigations fall back to an offline page when the network is unavailable.
 *  - Cross-origin requests (fonts, GitHub API) are left to the network.
 */
var CACHE = 'jegvet-cache-v2';

var CORE_ASSETS = [
  './',
  'index.html',
  'tools.html',
  'wiki.html',
  'search.html',
  'about.html',
  'settings.html',
  'offline.html',
  'styles.css',
  'app-shell.js',
  'tools-data.js',
  'search-engine.js',
  'wiki/wiki.js',
  'wiki/data/wiki-fallback.js',
  'manifest.webmanifest',
  'logo_day.png',
  'logo_day_small_fixed.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) {
        // Tolerate individual asset failures so install still succeeds.
        return Promise.all(CORE_ASSETS.map(function (url) {
          return cache.add(url).catch(function () { return null; });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          return key === CACHE ? null : caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function fetchAndCache(request) {
  return fetch(request).then(function (response) {
    if (response && response.ok && response.type === 'basic') {
      var copy = response.clone();
      caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
    }
    return response;
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') {
    return;
  }
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return; // Let cross-origin requests go straight to the network.
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) {
        fetchAndCache(request).catch(function () { /* keep serving cache */ });
        return cached;
      }
      return fetchAndCache(request).catch(function () {
        if (request.mode === 'navigate') {
          return caches.match('offline.html');
        }
        return undefined;
      });
    })
  );
});
