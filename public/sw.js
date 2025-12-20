// Pulse Life OS Service Worker
// Handles push notifications and basic caching

const CACHE_NAME = "pulse-v1";
const STATIC_ASSETS = [
  "/life",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log("[SW] Cache addAll failed:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
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
  // Early exit for non-GET requests
  if (event.request.method !== "GET") return;
  
  // Early exit for non-HTTP(S) requests (chrome-extension://, blob:, data:, etc.)
  const requestUrl = event.request.url;
  if (!requestUrl.startsWith("http://") && !requestUrl.startsWith("https://")) {
    return; // Don't even try to process chrome-extension://, blob:, etc.
  }
  
  // Skip API requests
  if (requestUrl.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Only cache same-origin requests
            try {
              cache.put(event.request, responseClone).catch((err) => {
                // Silently fail if caching fails (e.g., chrome-extension URLs)
                console.log("[SW] Cache put failed (non-fatal):", err);
              });
            } catch (err) {
              // Silently fail if request is not cacheable
            }
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
