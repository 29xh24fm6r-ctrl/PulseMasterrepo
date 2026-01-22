// Pulse Life OS Service Worker
// Handles push notifications and basic caching

const CACHE_NAME = "pulse-v25k-20260121";
const STATIC_ASSETS = [
  "/life",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Helper to identify strictly cacheable static assets
function isCacheable(url) {
  try {
    const u = new URL(url, self.location.origin);
    const p = u.pathname;
    if (p === "/favicon.ico") return true;
    if (p.startsWith("/_next/static/")) return true;
    if (p.startsWith("/icons/")) return true;
    if (p.startsWith("/images/")) return true;
    if (p.startsWith("/assets/")) return true;
    return false;
  } catch {
    return false;
  }
}

// Install - cache static assets safely
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        // Safely cache each asset individually, ONLY if it passes the strict allowlist
        for (const url of STATIC_ASSETS) {
          if (!isCacheable(url)) {
            console.log(`[SW] Skipping non-cacheable asset: ${url}`);
            continue;
          }

          try {
            // Use reload to ensure we get fresh content, but allow failure
            const req = new Request(url, { cache: "reload" });
            const res = await fetch(req);
            if (res && res.status === 200) {
              await cache.put(req, res.clone());
            }
          } catch (e) {
            console.log(`[SW] Failed to cache ${url}:`, e);
          }
        }
      } catch (err) {
        console.log("[SW] Cache open failed:", err);
      }
    })()
  );
  self.skipWaiting();
});

// Activate - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating pulse-v25k-20260121...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // CRITICAL: Strictly bypass runtime/auth endpoints (Phase 25K)
  // We return immediately to let the network handle it without SW interference.
  if (url.pathname.startsWith("/api/runtime/")) return;
  if (url.pathname.startsWith("/api/auth/")) return;
  if (url.pathname.startsWith("/api/clerk/")) return;
  if (url.pathname === "/manifest.json") return;

  // Skip other API requests generally (legacy rule)
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request);
      })
  );
});

// Push - handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("[SW] Push received");

  if (!event.data) {
    console.log("[SW] No push data");
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: "Pulse",
      body: event.data.text(),
    };
  }

  const title = data.title || "Pulse";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    tag: data.tag || "pulse-notification",
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || "/life",
      type: data.type || "general",
      id: data.id || null,
    },
    actions: data.actions || [],
    vibrate: [100, 50, 100],
    timestamp: data.timestamp || Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click - handle user interaction
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);
  event.notification.close();

  const notificationData = event.notification.data || {};
  let targetUrl = notificationData.url || "/life";

  // Handle specific actions
  if (event.action === "view") {
    targetUrl = notificationData.url || "/life";
  } else if (event.action === "dismiss") {
    // Just close, already done above
    return;
  } else if (event.action === "complete") {
    // Mark action as complete - handled by opening the URL
    targetUrl = notificationData.url || "/life";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Notification close - track dismissals (optional)
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed");
});

// Message - handle messages from the main app
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
