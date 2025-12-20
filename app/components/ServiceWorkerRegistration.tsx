"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // In development: aggressively unregister any existing service workers
    if (process.env.NODE_ENV !== "production") {
      // Unregister all service workers and clear caches
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().then((success) => {
            if (success) {
              console.log("[App] Service Worker unregistered (dev mode)");
            }
          });
          // Also try to update and skip waiting to force unregister
          if (registration.update) {
            registration.update();
          }
        });
        
        // Clear all caches if possible
        if ("caches" in window) {
          caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
              caches.delete(cacheName).catch(() => {
                // Ignore errors
              });
            });
          });
        }
      });
      return;
    }

    // Production: register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[App] Service Worker registered:", registration.scope);
      })
      .catch((error) => {
        console.error("[App] Service Worker registration failed:", error);
      });
  }, []);

  return null;
}
