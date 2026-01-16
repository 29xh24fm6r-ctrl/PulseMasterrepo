import { bootstrapDevUserIdFromServer } from "@/lib/auth/bootstrapClient";

const LS_KEY = "pulse_owner_user_id";

// Local helper removed in favor of canonical one
const bootstrapFromServer = bootstrapDevUserIdFromServer;

export async function devBootstrapPulseOwnerUserId(): Promise<void> {
    if (typeof window === "undefined") {
        return;
    }

    const existing = window.localStorage.getItem(LS_KEY);
    if (existing) return;

    // Only attempt auto-bootstrap in dev mode where env is present
    const devUserEnv = process.env.NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID;
    if (!devUserEnv) return;

    // HARDENING: One-shot reload guard.
    // Prevents infinite reload loops if the bootstrapping fails/retries repeatedly.
    const hasAttempted = window.sessionStorage.getItem("__dev_bootstrap_attempted");
    if (hasAttempted) {
        console.warn("[dev-auth] Bootstrap already attempted this session. Aborting to prevent reload loop.");
        return;
    }

    try {
        // Set guard BEFORE attempt
        window.sessionStorage.setItem("__dev_bootstrap_attempted", "1");

        const userId = await bootstrapFromServer();
        window.localStorage.setItem(LS_KEY, userId);

        // NODE_ENV is "production" in both Vercel Preview and Prod. 
        // We rely on the presence of the devUserEnv gate (checked above) to know we are in a safe context.
        const isProductionBuild = process.env.NODE_ENV === "production";
        const envLabel = isProductionBuild ? "PREVIEW" : "DEV";
        const color = isProductionBuild ? "color: #f59e0b; font-weight: bold;" : "color: #10b981; font-weight: bold;";

        console.info(
            `%c[dev-auth:${envLabel}] Bootstrapped from Server: ${userId}`,
            color
        );

        // Force app to re-hydrate with new auth context
        window.location.reload();
    } catch (err) {
        // If auto-heal fails, do nothing here; AuthMissing emergency button can recover.
        // Optional: console.warn(err);
        if (process.env.NODE_ENV === "development") {
            console.warn("[dev-auth] Auto-bootstrap failed", err);
        }
    }
}
