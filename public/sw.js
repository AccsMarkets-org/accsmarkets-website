const CACHE_NAME = "accsmarkets-v5";
const STATIC_ASSETS = ["/", "/listings", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Paths that are personalized/auth-gated and must never be cached or served
// stale — doing so risks showing one session's page after another (or, on
// /admin specifically, silently caching a logged-out redirect's login-page
// HTML under the authenticated URL, so a later network hiccup would serve
// that stale login page even though the real session is fine — this is what
// looked like "keeps asking me to log in again" on repeated PWA launches).
const NEVER_CACHE_PREFIXES = ["/admin", "/dashboard", "/checkout", "/login", "/onboarding"];

// Network-first for navigation; cache-first for static assets.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, API requests, and Next.js chunk/static files — never cache those.
  // Manifests are also skipped: the cache-first branch below never revalidates,
  // so a cached manifest would pin stale icon URLs/start_url indefinitely,
  // ignoring the no-cache header the server sends for them.
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/admin-manifest.json" ||
    url.pathname === "/sw.js"
  ) return;

  const neverCache = NEVER_CACHE_PREFIXES.some(
    (p) => url.pathname === p || url.pathname.startsWith(p + "/"),
  );

  if (request.mode === "navigate" && neverCache) {
    // Auth-gated: always hit the network, no cache read or write at all.
    // If genuinely offline, fail through to the browser's own offline page
    // rather than risk serving a stale/wrong-session cached copy.
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    // Network-first for HTML pages; serve offline.html when totally offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached ?? caches.match("/offline.html")
          )
        )
    );
  } else {
    // Cache-first for other static assets (icons, manifest, etc).
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        });
      })
    );
  }
});

// Push notification handler.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "AccsMarkets", body: event.data.text() }; }

  const { title = "AccsMarkets", body = "", link = "/" } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png?v=2",
      badge: "/icons/icon-192.png?v=2",
      data: { link },
    })
  );
});

// Click on push notification — open or focus the tab.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return clients.openWindow(link);
    })
  );
});
