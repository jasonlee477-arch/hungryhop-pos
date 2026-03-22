const CACHE_NAME = "hungryhop-v1";

// Files to cache for offline use
const STATIC_FILES = [
  "/",
  "/index.html",
  "/kitchen.html",
  "/dashboard.html",
  "/manifest.json",
  "/images/menu/hungryhop-truck.jpg",
  "/images/menu/aloo-tikki-burger.png",
  "/images/menu/pizza.jpg",
  "/images/menu/milkshake.jpg",
  "/images/menu/veg-momo.jpg",
  "/images/menu/fries.jpg",
  "/images/menu/default-food.jpg",
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap"
];

// INSTALL — cache all static files
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_FILES.map(url => {
        // Don't fail install if one resource fails
        return cache.add(url).catch(() => console.log("[SW] Could not cache:", url));
      }));
    })
  );
  self.skipWaiting();
});

// ACTIVATE — clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// FETCH — serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always go network-first for API calls
  const isAPI = url.pathname.startsWith("/menu") ||
                url.pathname.startsWith("/order") ||
                url.pathname.startsWith("/kitchen") ||
                url.pathname.startsWith("/stats") ||
                url.pathname.startsWith("/receipt") ||
                url.pathname.startsWith("/socket.io");

  if (isAPI) {
    // Network first — if offline, return error JSON
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ error: "offline", message: "You are offline. Order will sync when connected." }),
          { headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  // Static files — cache first, then network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache new static files we haven't seen before
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return caches.match("/index.html");
        }
      });
    })
  );
});

// SYNC — send pending offline orders when back online
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-orders") {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  // Orders are stored in localStorage on client
  // This triggers client to sync via postMessage
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: "SYNC_ORDERS" }));
}