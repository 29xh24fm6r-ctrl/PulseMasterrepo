"use client";

import React, { useEffect, useState } from "react";
import { getAuthEnabledClient } from "@/lib/auth/authEnabled";

type Props = {
    enabled: React.ReactNode;   // may use Clerk hooks
    disabled: React.ReactNode;  // MUST NOT use Clerk hooks
};

export function WithAuthEnabled({ enabled, disabled }: Props) {
    // Safe default to false to prevent hydration mismatch, or use a mounting check
    const [authEnabled, setAuthEnabled] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setAuthEnabled(getAuthEnabledClient());
        setMounted(true);
    }, []);

    if (!mounted) {
        // During SSR or initial mount, we default to showing nothing or disabled content?
        // To be safe against "useUser" errors, we must NOT render 'enabled' until we are sure.
        // So returning disabled or null is safer.
        // However, if 'disabled' is a static landing page, it's fine to render.
        return <>{disabled}</>;
    }

    return <>{authEnabled ? enabled : disabled}</>;
}
