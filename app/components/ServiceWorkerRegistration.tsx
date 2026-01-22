'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // 💀 KILL SWITCH (Phase 28-E): Force unregister all Service Workers
    // The previous SW version (v25k-20260121) is zombies-caching broken assets.
    // We must purge it to ensure users receive Provisoning Fix (PR #103).
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            console.log('[App] Stale Service Worker Unregistered:', success);
            // Force reload if we successfully killed one to get fresh assets
            if (success) {
              window.location.reload();
            }
          });
        }
      });
    }
  }, []);

  return null;
}
