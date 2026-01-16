"use client";

/**
 * Dev Auth Bootstrap
 * 
 * Ensures a valid `pulse_owner_user_id` exists in localStorage during development.
 * This is critical for the Command Bridge and other intelligence surfaces to load
 * real data without requiring a full auth handshake in local environments.
 */
export function devBootstrapPulseOwnerUserId() {
    if (typeof window === "undefined") {
        return;
    }

    const STORAGE_KEY = "pulse_owner_user_id";
    const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID;

    // Strict Gating: Only run if the Env Var is explicitly set.
    // This allows Preview environments (which run as "production") to enable Dev Auth 
    // by simply setting this variable in Vercel Project Settings.
    if (!DEV_USER_ID) {
        // In true production (no env var), we do nothing.
        // In local dev (if missing), we warn.
        if (process.env.NODE_ENV === "development") {
            console.warn(
                "[dev-auth] NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID is not set in .env.local. Bridge data fetching may fail."
            );
        }
        return;
    }

    if (!existingId) {
        localStorage.setItem(STORAGE_KEY, DEV_USER_ID);

        // NOTE: Cookie is now handled by /api/dev/bootstrap (server-side)
        // We keep local storage for client-side code that reads it.

        const isPreview = process.env.NODE_ENV === "production";
        const envLabel = isPreview ? "PREVIEW" : "DEV";
        const color = isPreview ? "color: #f59e0b; font-weight: bold;" : "color: #10b981; font-weight: bold;";

        console.info(
            `%c[dev-auth:${envLabel}] Bootstrapped ${STORAGE_KEY} & Cookie (Auth Bypass Enable)`,
            color
        );
    }
}
