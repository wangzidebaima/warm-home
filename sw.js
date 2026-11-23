// 家庭看板 Service Worker —— 只缓存静态外壳，内容/照片始终走网络保证自动更新
var CACHE = 'warm-home-v4';
var SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/lunar.js',
  './manifest.webmanifest',
  './avatars/son.png',
  './avatars/daughter.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).catch(function () {}));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // 内容数据、照片、天气 API —— 网络优先，保证自动更新
  if (url.pathname.indexOf('/data/') >= 0 || url.pathname.indexOf('/photos/') >= 0 || url.hostname.indexOf('open-meteo') >= 0) {
    e.respondWith(fetch(e.request).catch(function () { return caches.match(e.request); }));
    return;
  }
  // 静态外壳 —— 缓存优先
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    });
  }));
});
