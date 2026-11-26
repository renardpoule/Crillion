// Service worker : le jeu fonctionne hors ligne après une première visite.
const CACHE = "perle-rare-v3";
const FICHIERS = ["./", "index.html", "themes.js", "themes2.js", "themes3.js", "themes4.js", "themes5.js", "themes6.js", "themes7.js",
  "voyage.js", "fond.js", "effets.js", "jeu.js", "manifest.webmanifest", "images/icone-192.png", "images/icone-512.png",
  ...["terre", "iss", "lune", "soleil", "jupiter", "saturne", "neptune", "voyager", "alpha-centauri", "orion",
      "centre-galactique", "magellan", "andromede", "vierge", "amas", "deep-field"].map(n => `images/${n}.jpg`)];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Réseau d'abord (pour avoir la dernière version), cache en secours hors ligne.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
