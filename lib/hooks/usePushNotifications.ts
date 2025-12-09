/**
 * Push Notification Hook
 * lib/hooks/usePushNotifications.ts
 * 
 * Client-side hook for managing push notification subscriptions
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface PushState {
  supported: boolean;
  permission: NotificationPermission | "unknown";
  subscribed: boolean;
  loading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: "unknown",
    subscribed: false,
    loading: true,
    error: null,
  });

  // Check support and current state on mount
  useEffect(() => {
    const checkSupport = async () => {
      // Check browser support
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!supported) {
        setState({
          supported: false,
          permission: "unknown",
          subscribed: false,
          loading: false,
          error: "Push notifications not supported in this browser",
        });
        return;
      }

      // Get current permission
      const permission = Notification.permission;

      // Check if already subscribed
      let subscribed = false;
      try {
        const res = await fetch("/api/notifications/subscribe");
        const data = await res.json();
        subscribed = data.subscribed || false;
      } catch (e) {
        console.error("Failed to check subscription status:", e);
      }

      setState({
        supported: true,
        permission,
        subscribed,
        loading: false,
        error: null,
      });
    };

    checkSupport();
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((prev) => ({
          ...prev,
          permission,
          loading: false,
          error: "Permission denied",
        }));
        return false;
      }

      // Get VAPID public key
      const configRes = await fetch("/api/notifications/subscribe");
      const config = await configRes.json();
      
      if (!config.vapidPublicKey) {
        throw new Error("VAPID public key not configured");
      }

      // Register service worker if needed
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
      });

      // Save subscription to server
      const saveRes = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceName: getDeviceName(),
        }),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save subscription");
      }

      setState({
        supported: true,
        permission: "granted",
        subscribed: true,
        loading: false,
        error: null,
      });

      return true;
    } catch (error: any) {
      console.error("Subscribe error:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to subscribe",
      }));
      return false;
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Unsubscribe from browser
          await subscription.unsubscribe();

          // Remove from server
          await fetch("/api/notifications/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        }
      }

      setState((prev) => ({
        ...prev,
        subscribed: false,
        loading: false,
        error: null,
      }));

      return true;
    } catch (error: any) {
      console.error("Unsubscribe error:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to unsubscribe",
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

// Get device name for labeling
function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown Device";
}