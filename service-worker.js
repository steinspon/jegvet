/*
 * JegVet service worker — offline support and faster repeat loads.
 *
 * Strategy:
 *  - Precache the application shell, calculators and bundled wiki content on install.
 *  - Same-origin GET requests are served cache-first with a background refresh
 *    (stale-while-revalidate), so the app works offline and updates quietly.
 *  - Navigations fall back to an offline page when the network is unavailable.
 *  - Cross-origin requests (fonts, GitHub API) are left to the network.
 */
var CACHE = 'jegvet-cache-v7';

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
  'wiki-i18n-data.js',
  'calculator-utils.js',
  'wiki-content.js',
  'tools-data.js',
  'search-engine.js',
  'wiki/wiki.js',
  'wiki/data/content-manifest.json',
  'wiki/data/nav.json',
  'wiki/data/wiki-fallback.js',
  'anaesthetic-chinchilla-calculator.html',
  'anaesthetic-guinea-pig-calculator.html',
  'anaesthetic-rabbit-calculator.html',
  'anaesthetic-snake-calculator.html',
  'cat-heart-protocol-sedation-calculator.html',
  'bird-euthanasia-calculator.html',
  'dog-antihistamine-calculator.html',
  'dog-b1-cardiac-sedation-calculator.html',
  'dog-premed-calculator.html',
  'euthanasia-calculator.html',
  'ketofol-mixing-calculator.html',
  'kitty-magic-calculator.html',
  'medicated-drinking-water-calculator.html',
  'rabbit-critical-care-calculator.html',
  'rabbit-gi-stasis-calculator.html',
  'rabbit-upper-airway-disease-calculator.html',
  'rat-euthanasia-calculator.html',
  'seagull-sedation-calculator.html',
  'suspension-calculator.html',
  'wiki/content/Dermatology/Cat Derm/catderm.md',
  'wiki/content/Vet Med Stuff/chronic disease/feline-ckd-follow-up.md',
  'wiki/content/Vet Med Stuff/client communication/discharge-communication-checklist.md',
  'wiki/content/Vet Med Stuff/client communication/post-op-home-care-script.md',
  'wiki/content/Vet Med Stuff/clinical protocols/canine-acute-vomiting-triage.md',
  'wiki/content/Vet Med Stuff/emergency care/suspected-toxin-intake-triage.md',
  'wiki/content/Vet Med Stuff/surgery/pre-anesthesia-safety-checklist.md',
  'wiki/content/evidensia stuff/admintest.md',
  'wiki/content/evidensia stuff/admin/testsub.md',
  'wiki/content/evidensia stuff/seeyoume.md',
  'wiki/content/evidensia stuff/third time is a charm.md',
  'wiki/content/sandbox/test.md',
  'wiki/images/example.jpg',
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

  if (/\/wiki\/data\/content-manifest\.json$/.test(url.pathname)) {
    event.respondWith(
      fetchAndCache(request).catch(function () {
        return caches.match(request);
      })
    );
    return;
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
