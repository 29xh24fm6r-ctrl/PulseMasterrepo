export function haptic(pattern: number | number[] = 10) {
  try {
    if (typeof window === "undefined") return;
    // Basic Web Vibration API (Android/Chrome). iOS Safari typically no-ops.
    if ("vibrate" in navigator) {
      // @ts-expect-error - TS doesn't always include vibrate in Navigator types
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

