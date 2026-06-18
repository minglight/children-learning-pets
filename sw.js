// sw.js — 離線快取(cache-first)
const VERSION = 'pls-v18';
const ASSETS = [
  '.',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'app/config.js',
  'app/gen.js',
  'app/bank.js',
  'app/store.js',
  'app/art.js',
  'app/pets.js',
  'app/toys.js',
  'app/visuals.js',
  'app/main.js',
  'app/points.js',
  'app/screens.js',
  'app/room.js',
  'app/shelf.js',
  'app/quiz.js',
  'app/letters.js',
  'app/english.js',
  'questions/unit6.xml',
  'questions/unit7.xml',
  'questions/unit8.xml',
  'questions/unit9.xml'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        // 跑過一次就把字體等外部資源也存起來,確保離線可用
        if (res.ok && (e.request.url.indexOf('fonts.g') >= 0 || e.request.url.indexOf(self.location.origin) === 0)) {
          const clone = res.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function () { return caches.match('index.html'); });
    })
  );
});
