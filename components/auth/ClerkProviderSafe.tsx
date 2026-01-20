"use client";

import React from "react";

type Props = {
    children: React.ReactNode;
};

// ALLOWLIST for Production Keys
const ALLOWED_ORIGINS = [
    "localhost",
    "127.0.0.1",
    "pulselifeos.com",
    "www.pulselifeos.com",
    "app.pulselifeos.com",
];

export function ClerkProviderSafe({ children }: Props) {
    const isBuild =
        process.env.NEXT_PHASE === "phase-production-build" ||
        process.env.NEXT_PHASE === "phase-export";

    if (isBuild) {
        return (
            <html lang="en">
                <body></body>
            </html>
        );
    }

    return <ClerkProviderRuntime>{children}</ClerkProviderRuntime>;
}

function ClerkProviderRuntime({ children }: Props) {
    const [status, setStatus] = React.useState<"loading" | "ready" | "disabled">("loading");
    const [Provider, setProvider] = React.useState<React.ComponentType<any> | null>(null);

    React.useEffect(() => {
        let mounted = true;

        const init = async () => {
            // 1. Hostname Guard
            const hostname = window.location.hostname;
            // Check if hostname ends with any allowed origin or is exactly one of them
            // We use simple includes/endswith logic or exact match
            const isAllowed = ALLOWED_ORIGINS.some(allowed =>
                hostname === allowed || hostname.endsWith("." + allowed)
            );

            // Special handling: Vercel Previews (*.vercel.app) are explicitly BLOCKED from prod auth
            const isVercelPreview = hostname.endsWith(".vercel.app");

            const hasKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

            // Decision: Disable Auth if (Vercel Preview) OR (Not Allowed Origin) OR (Missing Key)
            // But we treat localhost specially as allowed.

            // If we are strictly not allowed:
            if (!isAllowed || isVercelPreview) {
                if (!mounted) return;
                console.warn("[ClerkProviderSafe] Auth Disabled: Domain not allowed or Vercel Preview detected.", hostname);
                setStatus("disabled");
                return;
            }

            // If key is missing but domain is allowed (e.g. localhost without .env), we also disable
            if (!hasKey) {
                if (!mounted) return;
                console.warn("[ClerkProviderSafe] Auth Disabled: Missing Publishable Key");
                setStatus("disabled");
                return;
            }

            try {
                // @ts-ignore
                const mod = await import("@clerk/nextjs");
                if (!mounted) return;
                setProvider(() => mod.ClerkProvider);
                setStatus("ready");
            } catch (e) {
                console.error("Failed to load ClerkProvider", e);
                // If it fails to load, we might as well show the disabled/error state
                setStatus("disabled");
            }
        };

        init();

        return () => {
            mounted = false;
        };
    }, []);

    // RENDER STATES

    if (status === "disabled") {
        return (
            <html lang="en">
                <body className="bg-zinc-950 text-slate-100 overflow-hidden">
                    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-4">
                        <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 text-yellow-200 max-w-md">
                            <h2 className="text-lg font-semibold mb-2">Preview Deployment: Auth Disabled</h2>
                            <p className="text-sm opacity-80 mb-4">
                                Authentication is only available on <code>app.pulselifeos.com</code>.
                            </p>
                            <div className="text-xs font-mono bg-black/50 p-2 rounded text-left overflow-x-auto">
                                Host: {typeof window !== 'undefined' ? window.location.hostname : 'unknown'}
                            </div>
                        </div>
                        {/* Render children in a "Guest" shell if needed, but for now we block access to avoid implementation complexity of a mock user */}
                    </div>
                </body>
            </html>
        );
    }

    if (status === "loading" || !Provider) {
        return (
            <html lang="en">
                <body className="bg-zinc-950 overflow-hidden">
                    <div className="min-h-screen flex items-center justify-center text-zinc-400">
                        <div className="opacity-70 text-sm animate-pulse">Loading Pulse OS...</div>
                    </div>
                </body>
            </html>
        );
    }

    return <Provider>{children}</Provider>;
}
