/* 画面のファイルを端末に保存して、すばやく開く。開くたびに、新しい版を裏で取りに行く。 */
var CACHE = "shikaku-v46";
var FILES = ["./", "index.html", "style.css", "app.js", "boki/", "boki/index.html", "boki/units.js", "boki/manifest.webmanifest", "boki/icon-192.png", "itpass/", "itpass/index.html", "itpass/units.js", "itpass/manifest.webmanifest", "itpass/icon-192.png", "html5/", "html5/index.html", "html5/units-l1.js", "html5/glossary-l1.js", "html5/mocks-l1.js", "html5/units.js", "html5/units-l2.js", "html5/manifest.webmanifest", "html5/icon-192.png", "html5-lv2/", "html5-lv2/index.html", "html5-lv2/manifest.webmanifest", "html5-lv2/icon-192.png", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(r, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(r).then(function (res) { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
