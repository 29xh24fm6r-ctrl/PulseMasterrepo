"use client";

import { WelcomeSurface } from "@/components/welcome/WelcomeSurface";
import { AuthGate } from "@/components/auth/AuthGate";
import { usePulseRuntime } from "@/components/runtime/PulseRuntimeProvider";

export default function WelcomePage() {
    const { lifeState } = usePulseRuntime(); // Implicitly using provider for auth state access
    // We need to know if we are authed. PulseRuntimeProvider logic handles mode 'auth_missing'.
    // However, AuthGate expects a boolean.
    // Let's use usePulseRuntime hook to get the mode directly if exposed, or infer it.
    // Provider exposes `runtimeMode`.
    const { runtimeMode } = usePulseRuntime();
    const authed = runtimeMode !== 'auth_missing';

    return (
        <AuthGate authed={authed}>
            <WelcomeSurface />
        </AuthGate>
    );
}
