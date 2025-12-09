import { useState, useCallback, useEffect } from "react";

/**
 * Hook to manage screen wake lock during voice calls
 * Keeps the screen on while the user is in a voice session
 */
export function useWakeLock() {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported("wakeLock" in navigator);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const lock = await navigator.wakeLock.request("screen");
      setWakeLock(lock);

      lock.addEventListener("release", () => {
        setWakeLock(null);
      });

      return true;
    } catch (err) {
      console.error("[WakeLock] Failed to acquire:", err);
      return false;
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
      } catch (err) {
        console.error("[WakeLock] Failed to release:", err);
      }
    }
  }, [wakeLock]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === "visible") {
        await requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [wakeLock, requestWakeLock]);

  // Release on unmount
  useEffect(() => {
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [wakeLock]);

  return {
    isSupported,
    isActive: wakeLock !== null,
    request: requestWakeLock,
    release: releaseWakeLock,
  };
}