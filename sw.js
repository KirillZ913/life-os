const CACHE = "life-os-v2-9";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.pathname.includes("/rest/v1/")) return; // синхронизация — только сеть

  const isShell = e.request.mode === "navigate" ||
    u.pathname.endsWith("/index.html") || u.pathname.endsWith("/life-os/") || u.pathname === "/";

  if (isShell) {
    // ОБОЛОЧКА: сеть прежде кэша — обновления приходят сразу
    e.respondWith(
      fetch(e.request).then(r => {
        if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put("./index.html", c)); }
        return r;
      }).catch(() => caches.match("./index.html").then(h => h || caches.match("./")))
    );
    return;
  }
  // остальное (шрифты, иконки): кэш прежде сети
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok && (u.origin === location.origin || u.host.includes("fonts."))) {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return r;
    }))
  );
});
