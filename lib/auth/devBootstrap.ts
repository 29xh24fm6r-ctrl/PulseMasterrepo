"use client";

/**
 * Dev Auth Bootstrap
 * 
 * Ensures a valid `pulse_owner_user_id` exists in localStorage during development.
 * This is critical for the Command Bridge and other intelligence surfaces to load
 * real data without requiring a full auth handshake in local environments.
 */
export function devBootstrapPulseOwnerUserId() {
    if (process.env.NODE_ENV !== "development") {
        return;
    }

    if (typeof window === "undefined") {
        return;
    }

    const STORAGE_KEY = "pulse_owner_user_id";
    const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID;

    if (!DEV_USER_ID) {
        console.warn(
            "[dev-auth] NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID is not set in .env.local. Bridge data fetching may fail."
        );
        return;
    }

    const existingId = localStorage.getItem(STORAGE_KEY);

    if (!existingId) {
        localStorage.setItem(STORAGE_KEY, DEV_USER_ID);
        console.info(
            `%c[dev-auth] Bootstrapped ${STORAGE_KEY} to "${DEV_USER_ID}"`,
            "color: #10b981; font-weight: bold;"
        );
    } else {
        // Optional: Log that we found an ID, just for confirmation
        // console.debug(`[dev-auth] Found existing ${STORAGE_KEY}: "${existingId}"`);
    }
}
