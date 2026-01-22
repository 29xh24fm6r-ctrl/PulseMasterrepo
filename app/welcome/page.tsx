"use client";

import { WelcomeSurface } from "@/components/welcome/WelcomeSurface";
import { AuthGate } from "@/components/auth/AuthGate";
import { usePulseWhoami } from "@/components/runtime/usePulseWhoami";

export default function WelcomePage() {
    const { authed, ready } = usePulseWhoami();

    // Deterministic skeleton while whoami loads
    if (!ready) return null;

    return (
        <AuthGate authed={authed} redirectTo="/sign-in">
            <WelcomeSurface />
        </AuthGate>
    );
}
